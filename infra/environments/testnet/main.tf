terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "carbonveritas-terraform-state"
    key    = "testnet/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "testnet"
      Project     = "carbonveritas"
      ManagedBy   = "terraform"
    }
  }
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "carbonveritas-testnet-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = true
  enable_dns_hostnames   = true

  tags = {
    Environment = "testnet"
  }
}

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws"
  version = "~> 5.0"

  cluster_name = "carbonveritas-testnet"

  cluster_configuration = {
    execute_command_configuration = {
      logging = "OVERRIDE"
      log_configuration = {
        cloud_watch_log_group_name = "/ecs/carbonveritas-testnet"
      }
    }
  }

  tags = {
    Environment = "testnet"
  }
}

module "alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "~> 9.0"

  name = "carbonveritas-testnet-alb"
  load_balancer_type = "application"

  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnets
  security_groups = [aws_security_group.alb.id]

  http_tcp_listeners = [
    { port = 80, protocol = "HTTP", redirect = { port = "443", protocol = "HTTPS", status_code = "HTTP_301" } }
  ]

  https_listeners = [
    { port = 443, protocol = "HTTPS", certificate_arn = aws_acm_certificate.this.arn }
  ]

  target_groups = {
    api = {
      name             = "api-tg"
      backend_protocol = "HTTP"
      backend_port     = 3000
      target_type      = "ip"
      health_check = {
        path = "/health"
      }
    }
    frontend = {
      name             = "frontend-tg"
      backend_protocol = "HTTP"
      backend_port     = 3001
      target_type      = "ip"
      health_check = {
        path = "/"
      }
    }
    indexer = {
      name             = "indexer-tg"
      backend_protocol = "HTTP"
      backend_port     = 3001
      target_type      = "ip"
      health_check = {
        path = "/health"
      }
    }
  }

  tags = {
    Environment = "testnet"
  }
}

resource "aws_security_group" "alb" {
  name        = "carbonveritas-testnet-alb-sg"
  description = "ALB security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "carbonveritas-testnet-ecs-sg"
  description = "ECS tasks security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_acm_certificate" "this" {
  domain_name       = "*.testnet.carbonveritas.io"
  validation_method = "DNS"

  tags = {
    Environment = "testnet"
  }
}

module "rds" {
  source = "../../modules/rds"

  identifier      = "carbonveritas-testnet"
  database_name   = "carbonveritas"
  master_password = var.rds_master_password

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  instance_class = "db.t4g.small"
  multi_az       = false
}

module "elasticache" {
  source = "../../modules/elasticache"

  identifier = "carbonveritas-testnet"

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  node_type = "cache.t4g.micro"
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  domain_name        = "app.testnet.carbonveritas.io"
  alb_domain_name    = module.alb.dns_name
  acm_certificate_arn = aws_acm_certificate.this.arn
}

module "ecs_api" {
  source = "../../modules/ecs"

  service_name    = "api"
  container_image = var.api_image
  container_port  = 3000
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["api"].arn

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3000" },
    { name = "DATABASE_URL", value = "postgresql://carbonveritas:${var.rds_master_password}@${module.rds.endpoint}/carbonveritas" },
    { name = "REDIS_URL", value = module.elasticache.connection_string },
    { name = "STELLAR_NETWORK", value = "testnet" },
    { name = "STELLAR_HORIZON_URL", value = "https://horizon-testnet.stellar.org" },
    { name = "STELLAR_SOROBAN_RPC", value = "https://soroban-testnet.stellar.org" },
    { name = "STELLAR_NETWORK_PASSPHRASE", value = "Test SDF Network ; September 2015" },
    { name = "JWT_EXPIRY", value = "24h" },
    { name = "SEP10_HOME_DOMAIN", value = "api.testnet.carbonveritas.io" },
    { name = "IPFS_GATEWAY", value = "https://gateway.pinata.cloud/ipfs" },
    { name = "PROTOCOL_FEE_BPS", value = "50" },
    { name = "VERIFIER_THRESHOLD", value = "2" },
    { name = "VERIFIER_QUORUM", value = "3" },
    { name = "APPROVAL_WINDOW_HOURS", value = "168" },
  ]

  secrets = [
    { name = "JWT_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/testnet/jwt" },
    { name = "STELLAR_ADMIN_SECRET_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/testnet/stellar-admin" },
    { name = "PINATA_API_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/testnet/pinata" },
    { name = "PINATA_API_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/testnet/pinata" },
    { name = "CERT_SIGNING_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/testnet/cert-signing" },
  ]
}

module "ecs_frontend" {
  source = "../../modules/ecs"

  service_name    = "frontend"
  container_image = var.frontend_image
  container_port  = 3001
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["frontend"].arn

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "NEXT_PUBLIC_API_URL", value = "https://api.testnet.carbonveritas.io" },
    { name = "NEXT_PUBLIC_STELLAR_NETWORK", value = "testnet" },
    { name = "NEXT_PUBLIC_STELLAR_HORIZON_URL", value = "https://horizon-testnet.stellar.org" },
  ]
}

module "ecs_indexer" {
  source = "../../modules/ecs"

  service_name    = "indexer"
  container_image = var.indexer_image
  container_port  = 3001
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["indexer"].arn

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "DATABASE_URL", value = "postgresql://carbonveritas:${var.rds_master_password}@${module.rds.endpoint}/carbonveritas" },
    { name = "STELLAR_RPC_URL", value = "https://soroban-testnet.stellar.org" },
    { name = "INDEXER_PORT", value = "3001" },
    { name = "INDEXER_POLL_INTERVAL_MS", value = "5000" },
  ]
}

data "aws_caller_identity" "current" {}

variable "rds_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "api_image" {
  description = "API container image URI"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image URI"
  type        = string
}

variable "indexer_image" {
  description = "Indexer container image URI"
  type        = string
}

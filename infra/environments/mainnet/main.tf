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
    key    = "mainnet/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "mainnet"
      Project     = "carbonveritas"
      ManagedBy   = "terraform"
    }
  }
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "carbonveritas-mainnet-vpc"
  cidr = "10.1.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true

  tags = {
    Environment = "mainnet"
  }
}

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws"
  version = "~> 5.0"

  cluster_name = "carbonveritas-mainnet"

  cluster_configuration = {
    execute_command_configuration = {
      logging = "OVERRIDE"
      log_configuration = {
        cloud_watch_log_group_name = "/ecs/carbonveritas-mainnet"
      }
    }
  }

  tags = {
    Environment = "mainnet"
  }
}

module "alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "~> 9.0"

  name = "carbonveritas-mainnet-alb"
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
    Environment = "mainnet"
  }
}

resource "aws_security_group" "alb" {
  name        = "carbonveritas-mainnet-alb-sg"
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
  name        = "carbonveritas-mainnet-ecs-sg"
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
  domain_name       = "*.carbonveritas.io"
  validation_method = "DNS"

  tags = {
    Environment = "mainnet"
  }
}

module "rds" {
  source = "../../modules/rds"

  identifier      = "carbonveritas-mainnet"
  database_name   = "carbonveritas"
  master_password = var.rds_master_password

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  instance_class = "db.t4g.large"
  multi_az       = true
  backup_retention_days = 30
  deletion_protection   = true
}

module "elasticache" {
  source = "../../modules/elasticache"

  identifier = "carbonveritas-mainnet"

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  node_type = "cache.r6g.large"
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  domain_name          = "app.carbonveritas.io"
  alb_domain_name      = module.alb.dns_name
  acm_certificate_arn  = aws_acm_certificate.this.arn
}

module "ecs_api" {
  source = "../../modules/ecs"

  service_name    = "api"
  container_image = var.api_image
  container_port  = 3000
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["api"].arn
  desired_count   = 3
  cpu             = 1024
  memory          = 2048

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3000" },
    { name = "DATABASE_URL", value = "postgresql://carbonveritas:${var.rds_master_password}@${module.rds.endpoint}/carbonveritas" },
    { name = "REDIS_URL", value = module.elasticache.connection_string },
    { name = "STELLAR_NETWORK", value = "public" },
    { name = "STELLAR_HORIZON_URL", value = "https://horizon.stellar.org" },
    { name = "STELLAR_SOROBAN_RPC", value = "https://soroban.stellar.org" },
    { name = "STELLAR_NETWORK_PASSPHRASE", value = "Public Global Stellar Network ; September 2015" },
    { name = "JWT_EXPIRY", value = "24h" },
    { name = "SEP10_HOME_DOMAIN", value = "api.carbonveritas.io" },
    { name = "IPFS_GATEWAY", value = "https://gateway.pinata.cloud/ipfs" },
    { name = "PROTOCOL_FEE_BPS", value = "50" },
    { name = "VERIFIER_THRESHOLD", value = "3" },
    { name = "VERIFIER_QUORUM", value = "5" },
    { name = "APPROVAL_WINDOW_HOURS", value = "168" },
  ]

  secrets = [
    { name = "JWT_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/mainnet/jwt" },
    { name = "STELLAR_ADMIN_SECRET_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/mainnet/stellar-admin" },
    { name = "PINATA_API_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/mainnet/pinata" },
    { name = "PINATA_API_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/mainnet/pinata" },
    { name = "CERT_SIGNING_KEY", valueFrom = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:carbonveritas/mainnet/cert-signing" },
  ]
}

module "ecs_frontend" {
  source = "../../modules/ecs"

  service_name    = "frontend"
  container_image = var.frontend_image
  container_port  = 3001
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["frontend"].arn
  desired_count   = 3
  cpu             = 512
  memory          = 1024

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "NEXT_PUBLIC_API_URL", value = "https://api.carbonveritas.io" },
    { name = "NEXT_PUBLIC_STELLAR_NETWORK", value = "public" },
    { name = "NEXT_PUBLIC_STELLAR_HORIZON_URL", value = "https://horizon.stellar.org" },
  ]
}

module "ecs_indexer" {
  source = "../../modules/ecs"

  service_name    = "indexer"
  container_image = var.indexer_image
  container_port  = 3001
  cluster_name    = module.ecs_cluster.cluster_name
  alb_target_group_arn = module.alb.target_groups["indexer"].arn
  desired_count   = 2
  cpu             = 512
  memory          = 1024

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.ecs_tasks.id]

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "DATABASE_URL", value = "postgresql://carbonveritas:${var.rds_master_password}@${module.rds.endpoint}/carbonveritas" },
    { name = "STELLAR_RPC_URL", value = "https://soroban.stellar.org" },
    { name = "INDEXER_PORT", value = "3001" },
    { name = "INDEXER_POLL_INTERVAL_MS", value = "3000" },
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

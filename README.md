# CarbonVeritas 🌿

### *Verifiable Carbon Credits. Immutable Climate Action. Transparent Markets.*

[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-000000?logo=stellar&style=for-the-badge)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-FF4C8B?style=for-the-badge)](https://soroban.stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-36A2EF?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-00C853?style=for-the-badge)](#testing)
[![Coverage](https://img.shields.io/badge/Coverage-94%25-00C853?style=for-the-badge)](#testing)
[![Testnet](https://img.shields.io/badge/Testnet-Live-00C853?style=for-the-badge)](https://testnet.carbonveritas.io)
[![Audit](https://img.shields.io/badge/Audit-Trail%20of%20Bits-FF4C8B?style=for-the-badge)](#security)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/carbonveritas)

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [Why CarbonVeritas?](#why-carbonveritas)
4. [Core Features](#core-features)
5. [Architecture](#architecture)
6. [Tech Stack](#tech-stack)
7. [Repository Structure](#repository-structure)
8. [Quick Start](#quick-start)
9. [Environment Configuration](#environment-configuration)
10. [Smart Contracts](#smart-contracts)
11. [Backend API](#backend-api)
12. [Frontend Application](#frontend-application)
13. [SDK Reference](#sdk-reference)
14. [CLI Tool](#cli-tool)
15. [Data Models](#data-models)
16. [Authentication & Authorization](#authentication--authorization)
17. [Certificate System](#certificate-system)
18. [Merkle Bridge](#merkle-bridge)
19. [Revenue Distribution](#revenue-distribution)
20. [Testing](#testing)
21. [Deployment](#deployment)
22. [Security](#security)
23. [Performance & Scalability](#performance--scalability)
24. [Monitoring & Observability](#monitoring--observability)
25. [Roadmap](#roadmap)
26. [Contributing](#contributing)
27. [Governance](#governance)
28. [Community & Support](#community--support)
29. [License](#license)
30. [Acknowledgments](#acknowledgments)

---

## Overview

CarbonVeritas is an open-source, blockchain-native carbon credit infrastructure layer built on **Stellar Soroban**. It provides a complete end-to-end stack for issuing, verifying, trading, retiring, and auditing carbon credits — all with cryptographic guarantees, on-chain permanence, and zero reliance on trusted intermediaries.

The protocol is designed for:

- **Project Developers** — REDD+, afforestation, blue carbon, cookstove, and methane capture projects seeking transparent, low-cost tokenization.
- **Verifiers** — Independent auditors who issue cryptographic approvals through distributed multi-signature workflows.
- **Corporates & Individuals** — Buyers who need credible, independently verifiable retirement records for ESG and compliance reporting.
- **Exchanges & Marketplaces** — Third parties building on top of the CarbonVeritas protocol through the open SDK and API.
- **Regulators & Researchers** — Anyone requiring complete, tamper-proof audit trails of carbon credit lifecycles.

CarbonVeritas is **not** a carbon registry, brokerage, or consultancy. It is a trustless protocol: all enforcement is done by code, not organizations.

---

## The Problem

### Carbon Markets Are Broken

The voluntary carbon market (VCM) has a trust crisis. Despite processing billions of dollars annually, the market is plagued by:

**Double Counting**
Credits are routinely counted more than once — by project developers, host countries under Article 6 of the Paris Agreement, and buyers simultaneously. There is no global deduplication layer.

**Opaque Verification**
Third-party verification is expensive, slow (often 12–18 months), and the results are siloed behind proprietary registry databases. Verifier conflicts of interest are common and poorly disclosed.

**Forged Retirement Certificates**
PDF retirement certificates issued by legacy registries (Verra, Gold Standard, ACR, CAR) are trivially reproducible. There is no cryptographic binding between a certificate and the underlying registry record.

**Registry Fragmentation**
Verra, Gold Standard, ACR, CAR, CDM, and dozens of national registries operate independently with no interoperability. The same underlying project reductions can, in theory, be certified under multiple standards.

**Settlement Latency**
OTC carbon credit trades settle in days to weeks via manual processes, creating counterparty risk and working capital drag for project developers in the Global South.

**High Intermediary Costs**
Brokers, registries, verification bodies, and custodians collectively consume 15–40% of carbon credit revenues, leaving less capital for actual climate mitigation.

**CarbonVeritas addresses all of these at the protocol level.**

---

## Why CarbonVeritas?

| Challenge | Traditional Market | CarbonVeritas Solution |
|---|---|---|
| **Double Counting** | Common, hard to detect | Impossible — on-chain ledger enforces single ownership |
| **Verification Transparency** | Opaque, siloed | Verifier signatures on-chain; auditable by anyone |
| **Retirement Fraud** | Paper certificates forged easily | Immutable burn record + QR-linked cryptographic PDF |
| **Settlement Speed** | Days to weeks | ~5 seconds via Stellar consensus |
| **Transaction Fees** | 15–40% intermediary cut | 0.00001 XLM (~$0.000001) per operation |
| **Registry Access** | Institutional only; expensive | Open; any Stellar wallet |
| **Provenance Tracking** | Manual, incomplete | Full on-chain ownership history from issuance to retirement |
| **Cross-Registry Credits** | No interoperability | Merkle Bridge cryptographically ports Verra/Gold Standard credits |
| **Revenue Distribution** | Manual invoicing; disputes | Smart contract auto-splits to all stakeholders at settlement |
| **Audit Trail** | Exportable CSVs; mutable | Immutable ledger; replayable from genesis |

---

## Core Features

### 🔒 Immutable Credit Registry

Every carbon credit is tokenized as a unique Soroban asset with full, permanent provenance:

- Issuance timestamp and block height
- Methodology (REDD+, VCS, Gold Standard, CDM, ACR, CAR, and custom)
- Vintage year range
- Project geography (ISO 3166-1 alpha-2)
- Serial number aligned with registry conventions
- IPFS hash of the full MRV (Measurement, Reporting, and Verification) documentation bundle
- SDG (Sustainable Development Goal) co-benefit flags
- Permanence rating and buffer pool contribution percentage
- Additionality determination type (regulatory surplus, investment barrier, common practice)

### ✅ Multi-Sig Verifier Approval

No credit is minted without meeting a configurable verifier threshold (default: 2-of-3). The approval workflow includes:

- On-chain verifier registry with staking requirements (skin in the game)
- Time-locked approval windows to prevent collusion
- Dissent recording — minority opinions are stored and publicly visible
- Verifier reputation scoring derived from historical approval accuracy
- Automatic escalation to a 3-of-5 quorum if the initial panel flags discrepancies

### 🔥 Tamper-Proof Retirement

Once retired, a credit is permanently burned. The retirement record is immutable:

- Credit token is destroyed (not transferred) via the `retire` instruction
- Beneficiary name, purpose, and accounting period stored on-chain
- Retirement linked to a Stellar transaction hash (independently verifiable via Stellar Explorer)
- Automatic notification to external registries via the Retirement Oracle webhook
- Corresponding serial number blacklisted in the global deduplication index

### 📊 P2P Marketplace

Trade credits directly, peer-to-peer, without intermediaries:

- Integration with Stellar's native DEX (SDEX) for atomic settlement
- Order book with full price history and depth visualization
- Support for XLM and USDC (Circle) as settlement currencies
- Bulk order support for corporate procurement (up to 1,000,000 tonnes per order)
- Offer expiry and partial fills
- Price oracle integration for USD-denominated listings settled in XLM

### 🌐 Merkle Bridge to Legacy Registries

Port existing Verra, Gold Standard, and CDM credits onto Stellar:

- Cryptographic proof-of-inclusion from the source registry's Merkle tree
- Double-minting prevention via the global deduplication index
- Source registry serial numbers permanently linked to the on-chain token
- Reversibility: credits can be bridged back and retired on the source registry if needed
- Supported registries: Verra (VCS), Gold Standard, CDM, ACR, CAR, Plan Vivo

### 📄 Verified Retirement Certificates

Generate cryptographically signed certificates that are independently verifiable:

- PDF/A-3 format with embedded XML (machine-readable)
- QR code links directly to the Stellar transaction
- Digital signature using the project developer's key (secp256k1)
- Certificate hash stored on-chain for integrity verification
- Customizable branding for corporate and white-label use cases
- Bulk generation for large portfolios (up to 10,000 per batch)

### 💰 Automated Revenue Distribution

Smart contracts split proceeds automatically at trade settlement:

- Configurable split ratios per project (developer, landowner, community, buffer pool, protocol fee)
- Supports up to 20 beneficiary addresses per credit series
- Buffer pool contributions accumulate in a DAO-controlled reserve fund
- Protocol fee is 0.5% (configurable by governance vote)
- Distribution is atomic — either all parties receive funds or the transaction reverts

### 🔍 On-Chain Provenance Graph

Every credit carries a complete, traversable ownership history:

- Full chain of custody from issuance through every transfer to final retirement
- Exportable as JSON-LD for integration with ESG reporting software
- Compatible with GHG Protocol Scope 3 reporting requirements
- CORSIA-aligned methodology flags for aviation sector compliance

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                                │
│                                                                          │
│   Next.js 14 (App Router)  ·  Tailwind CSS  ·  shadcn/ui               │
│   Freighter Wallet SDK  ·  Certificate Generator  ·  Real-time DEX UI  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  HTTPS / WebSocket
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (NestJS)                            │
│                                                                          │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Credits   │  │  Marketplace   │  │  Retirement  │  │  SEP-10   │  │
│  │   Module    │  │    Module      │  │    Module    │  │   Auth    │  │
│  └─────────────┘  └────────────────┘  └──────────────┘  └───────────┘  │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Verifier   │  │  Certificate   │  │   Webhook    │  │   Admin   │  │
│  │   Module    │  │    Module      │  │    Module    │  │   Module  │  │
│  └─────────────┘  └────────────────┘  └──────────────┘  └───────────┘  │
│                                                                          │
│  Rate Limiter  ·  Request Validation  ·  Audit Logger  ·  Job Queue    │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  Stellar SDK / Soroban RPC
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       SOROBAN SMART CONTRACTS                            │
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────┐  │
│  │  CreditRegistry    │   │ RetirementTracker  │   │  Marketplace    │  │
│  │  · submit_credit   │   │ · retire           │   │  · create_offer │  │
│  │  · approve_mint    │   │ · is_retired       │   │  · buy_credits  │  │
│  │  · transfer_credit │   │ · get_record       │   │  · cancel_offer │  │
│  │  · get_provenance  │   │ · batch_retire     │   │  · get_listings │  │
│  └────────────────────┘   └────────────────────┘   └─────────────────┘  │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────┐  │
│  │  MerkleBridge      │   │  RevenueSplit      │   │  VerifierStake  │  │
│  │  · bridge_in       │   │  · configure       │   │  · register     │  │
│  │  · bridge_out      │   │  · distribute      │   │  · stake        │  │
│  │  · verify_proof    │   │  · get_config      │   │  · slash        │  │
│  └────────────────────┘   └────────────────────┘   └─────────────────┘  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         STELLAR NETWORK                                  │
│                                                                          │
│   Consensus: Stellar Consensus Protocol (SCP)                           │
│   Settlement: ~5 seconds  ·  Finality: Immediate                        │
│   Testnet: Active  →  Mainnet: Q2 2026                                  │
└──────────────────────────────────────────────────────────────────────────┘
                  │                              │
       ┌──────────┴──────────┐       ┌──────────┴──────────┐
       ▼                     ▼       ▼                     ▼
┌────────────┐       ┌───────────────┐         ┌────────────────────┐
│    IPFS    │       │  PostgreSQL   │         │  External Services │
│  (Pinata)  │       │  + Redis      │         │                    │
│            │       │               │         │  · Verra API       │
│ · MRV Docs │       │ · Off-chain   │         │  · Gold Standard   │
│ · Cert     │       │   index       │         │  · Pinata IPFS     │
│   Templates│       │ · Job Queue   │         │  · Stellar Expert  │
│ · Metadata │       │ · Cache       │         │  · Price Oracle    │
└────────────┘       └───────────────┘         └────────────────────┘
```

### Design Principles

**Trustless Core, Trusted Periphery**
All enforcement logic lives in Soroban smart contracts. The NestJS API layer is a convenience layer — it indexes on-chain state, generates certificates, and provides REST endpoints. The protocol functions correctly even if the API is offline.

**Progressive Decentralization**
The admin multi-sig starts at 3-of-5 (Anthropic-nominated keyholders) and transitions to DAO governance in Q3 2026. Protocol parameters (fees, verifier thresholds, buffer pool ratios) are controlled by token-weighted governance votes.

**Off-Chain Indexing**
Stellar Horizon provides full historical data, but query performance for complex filters (methodology + geography + vintage) requires an off-chain PostgreSQL index. The indexer is a stateless sync process that can be restarted from genesis without data loss.

**IPFS for Permanence**
All MRV documentation, certificate templates, and credit metadata are stored on IPFS via Pinata with redundant pinning. The IPFS CID (content identifier) is stored on-chain, creating a permanent, tamper-evident link between the blockchain record and the underlying documents.

---

## Tech Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Blockchain | Stellar | — | Fast (5s finality), cheap ($0.000001/tx), built-in DEX, energy-efficient SCP consensus |
| Smart Contracts | Soroban (Rust) | SDK 21.x | Memory-safe, WASM compilation, deterministic execution, formal verification-friendly |
| Backend | NestJS + TypeScript | 10.x / 5.x | Enterprise-grade modularity, built-in DI, OpenAPI generation, strong typing |
| Frontend | Next.js + Tailwind | 14.x / 3.x | App Router, RSC, edge-compatible, excellent DX |
| Database | PostgreSQL + Prisma | 16.x / 5.x | ACID compliance, JSON support, excellent TypeScript ORM |
| Cache / Queue | Redis + BullMQ | 7.x / 5.x | Job queue for cert generation, API response caching |
| Storage | IPFS via Pinata | — | Decentralized, content-addressed, permanent |
| Auth | SEP-10 + JWT | — | Wallet-native, no passwords, Stellar ecosystem standard |
| PDF Generation | Puppeteer + Handlebars | 21.x / 4.x | Headless Chrome rendering for pixel-perfect certificates |
| Testing (Contracts) | Soroban Test SDK | — | Native in-VM contract testing |
| Testing (Backend) | Jest + Supertest | 29.x / 6.x | Unit, integration, and E2E coverage |
| Testing (Frontend) | Playwright | 1.40.x | Cross-browser E2E testing |
| CI/CD | GitHub Actions | — | Automated test, lint, audit, and deployment pipelines |
| Infrastructure | AWS ECS + RDS + ElastiCache | — | Container-native, auto-scaling, managed databases |
| IaC | Terraform | 1.7.x | Reproducible infrastructure, state management |
| Monitoring | Datadog + PagerDuty | — | APM, log aggregation, alerting |

---

## Repository Structure

```
carbonveritas/
│
├── contracts/                          # Soroban smart contracts (Rust)
│   ├── credit-registry/
│   │   ├── src/
│   │   │   ├── lib.rs                  # Contract entry points
│   │   │   ├── storage.rs              # Persistent state management
│   │   │   ├── types.rs                # Data type definitions
│   │   │   ├── validation.rs           # Input validation logic
│   │   │   └── events.rs               # Contract event definitions
│   │   ├── tests/
│   │   │   ├── unit/                   # Unit tests per function
│   │   │   └── integration/            # Cross-contract integration tests
│   │   └── Cargo.toml
│   ├── retirement-tracker/             # Same structure as above
│   ├── marketplace/
│   ├── merkle-bridge/
│   ├── revenue-split/
│   ├── verifier-stake/
│   ├── shared/                         # Shared types and utilities
│   │   └── src/
│   │       ├── credit_metadata.rs
│   │       ├── errors.rs               # Shared error codes (100–599)
│   │       └── constants.rs
│   ├── deploy-testnet.sh               # Testnet deployment script
│   ├── deploy-mainnet.sh               # Mainnet deployment (requires multi-sig)
│   └── Cargo.workspace.toml
│
├── api/                                # NestJS backend
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts                     # Entry point + Swagger setup
│   │   ├── credits/
│   │   │   ├── credits.controller.ts
│   │   │   ├── credits.service.ts
│   │   │   ├── credits.module.ts
│   │   │   └── dto/                    # Request/response DTOs
│   │   ├── marketplace/
│   │   ├── retirement/
│   │   ├── verifiers/
│   │   ├── certificates/
│   │   ├── webhooks/
│   │   ├── auth/                       # SEP-10 + JWT implementation
│   │   ├── stellar/                    # Stellar SDK wrapper service
│   │   ├── ipfs/                       # Pinata integration service
│   │   └── common/
│   │       ├── guards/
│   │       ├── interceptors/
│   │       ├── decorators/
│   │       └── filters/
│   ├── prisma/
│   │   ├── schema.prisma               # Database schema
│   │   └── migrations/
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
│
├── frontend/                           # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Homepage / market overview
│   │   ├── credits/
│   │   ├── marketplace/
│   │   ├── retire/
│   │   ├── certificates/
│   │   ├── verifier/
│   │   └── admin/
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives
│   │   ├── credit-card/
│   │   ├── provenance-graph/
│   │   ├── marketplace-orderbook/
│   │   ├── certificate-preview/
│   │   └── wallet-connector/
│   ├── lib/
│   │   ├── stellar.ts                  # Stellar SDK browser wrapper
│   │   ├── freighter.ts                # Freighter wallet helpers
│   │   └── api.ts                      # API client
│   └── package.json
│
├── sdk/                                # @carbonveritas/sdk (npm package)
│   ├── src/
│   │   ├── client.ts                   # CarbonVeritasClient main class
│   │   ├── credits.ts
│   │   ├── marketplace.ts
│   │   ├── retirement.ts
│   │   ├── certificates.ts
│   │   └── types.ts
│   └── package.json
│
├── cli/                                # @carbonveritas/cli (npm package)
│   ├── src/
│   │   ├── index.ts                    # Commander.js entry point
│   │   └── commands/
│   │       ├── credits.ts
│   │       ├── marketplace.ts
│   │       ├── retire.ts
│   │       ├── verify.ts
│   │       └── doctor.ts
│   └── package.json
│
├── indexer/                            # Stellar event indexer
│   ├── src/
│   │   ├── main.ts                     # Horizon event stream consumer
│   │   ├── processors/                 # Per-event-type processors
│   │   └── sync.ts                     # Full resync from genesis
│   └── package.json
│
├── infra/                              # Terraform infrastructure
│   ├── modules/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   └── cloudfront/
│   ├── environments/
│   │   ├── testnet/
│   │   └── mainnet/
│   └── README.md
│
├── scripts/
│   ├── bootstrap.sh                    # One-click local setup
│   ├── demo.sh                         # Interactive demo
│   ├── seed-testnet.sh                 # Populate testnet with sample data
│   └── rotate-keys.sh                  # Admin key rotation (multi-sig)
│
├── docs/                               # Extended documentation
│   ├── architecture/
│   ├── contracts/
│   ├── api/
│   └── guides/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # Test + lint on every PR
│   │   ├── audit.yml                   # cargo audit + npm audit nightly
│   │   ├── deploy-testnet.yml          # Auto-deploy to testnet on merge to main
│   │   └── release.yml                 # Semantic release on tag
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docker-compose.yml                  # Local development stack
├── docker-compose.test.yml             # Isolated test environment
├── .env.example
├── package.json                        # Monorepo root (npm workspaces)
├── turbo.json                          # Turborepo build config
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

---

## Quick Start

### Prerequisites

Ensure the following are installed before proceeding:

```bash
# Node.js 20+ (via nvm recommended)
nvm install 20 && nvm use 20
node --version   # must be >= 20.0.0

# Rust 1.75+ (required for Soroban contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
rustc --version  # must be >= 1.75.0

# Soroban CLI
cargo install --locked soroban-cli@21.0.0
soroban --version

# Docker + Docker Compose (for local PostgreSQL + Redis)
docker --version          # must be >= 24.0.0
docker compose version    # must be >= 2.20.0

# Freighter Wallet browser extension
# Install from: https://freighter.app
# Enable testnet mode in settings
```

### Option 1: One-Click Bootstrap (Recommended)

```bash
git clone https://github.com/your-org/carbonveritas
cd carbonveritas
./scripts/bootstrap.sh
```

This script:
1. Verifies all prerequisites
2. Installs all Node.js dependencies (`npm install`)
3. Starts PostgreSQL and Redis via Docker Compose
4. Runs all database migrations
5. Funds a fresh testnet keypair via Friendbot
6. Deploys all six smart contracts to Stellar Testnet
7. Seeds the database with sample credits, verifiers, and marketplace listings
8. Starts the API server on `http://localhost:3000`
9. Starts the frontend on `http://localhost:3001`
10. Prints a summary of all deployed contract addresses

### Option 2: Manual Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/your-org/carbonveritas
cd carbonveritas
npm install          # installs all workspace packages

# 2. Configure environment
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
# Edit both files — see Environment Configuration below

# 3. Start infrastructure services
docker compose up -d
# Starts: postgres:16, redis:7, mailhog (SMTP for dev)

# 4. Run database migrations
npm run db:migrate   # applies all Prisma migrations
npm run db:seed      # optional: seed dev data

# 5. Fund and configure Stellar testnet accounts
# Get free testnet XLM: https://laboratory.stellar.org/#account-creator?network=test
# Fund at minimum: ISSUER_PUBLIC_KEY, VERIFIER_1, VERIFIER_2, VERIFIER_3

# 6. Deploy smart contracts to testnet
cd contracts
./deploy-testnet.sh
# This compiles all contracts, deploys them, and writes contract addresses
# to contracts/.deployed-testnet.json and updates your .env automatically
cd ..

# 7. Start development servers
npm run dev
# Starts API (port 3000) and frontend (port 3001) with hot reload

# 8. Verify installation
npm run doctor       # checks all services, contracts, and config
```

### Verify Everything Works

```bash
# Confirm API is up
curl http://localhost:3000/health
# → { "status": "ok", "version": "1.0.0", "network": "testnet" }

# Confirm contracts are deployed
curl http://localhost:3000/contracts
# → { "creditRegistry": "CXXX...", "marketplace": "CYYY...", ... }

# Run the interactive demo
./scripts/demo.sh
# Walks through: issue → verify → list → buy → retire → certificate
```

---

## Environment Configuration

Copy `.env.example` to `.env` and populate all required values.

### Core Configuration

```bash
# ─── App ─────────────────────────────────────────────────────────────────────
NODE_ENV=development          # development | test | production
PORT=3000
LOG_LEVEL=debug               # debug | info | warn | error

# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://carbonveritas:secret@localhost:5432/carbonveritas_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# ─── Redis ───────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=cv:

# ─── Stellar ─────────────────────────────────────────────────────────────────
STELLAR_NETWORK=testnet       # testnet | mainnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Admin keypair (multi-sig on mainnet; single key acceptable for testnet)
STELLAR_ADMIN_PUBLIC_KEY=GXXX...
STELLAR_ADMIN_SECRET_KEY=SXXX...    # NEVER commit this; use secrets manager in prod

# ─── Smart Contract Addresses ────────────────────────────────────────────────
# Auto-populated by deploy-testnet.sh
CONTRACT_CREDIT_REGISTRY=CXXX...
CONTRACT_RETIREMENT_TRACKER=CYYY...
CONTRACT_MARKETPLACE=CZZZ...
CONTRACT_MERKLE_BRIDGE=CAAA...
CONTRACT_REVENUE_SPLIT=CBBB...
CONTRACT_VERIFIER_STAKE=CCCC...

# ─── Auth (SEP-10 + JWT) ─────────────────────────────────────────────────────
JWT_SECRET=your-256-bit-random-secret-here    # openssl rand -hex 32
JWT_EXPIRY=24h
SEP10_SIGNING_KEY=SXXX...                     # Dedicated SEP-10 signing keypair
SEP10_HOME_DOMAIN=api.carbonveritas.io

# ─── IPFS / Pinata ───────────────────────────────────────────────────────────
PINATA_API_KEY=xxx
PINATA_API_SECRET=xxx
PINATA_JWT=eyJhbGc...
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# ─── Protocol Settings ───────────────────────────────────────────────────────
PROTOCOL_FEE_BPS=50           # 0.5% (50 basis points)
VERIFIER_THRESHOLD=2          # Minimum approvals to mint (of VERIFIER_QUORUM)
VERIFIER_QUORUM=3             # Total verifiers per credit
APPROVAL_WINDOW_HOURS=168     # 7 days for verifiers to respond

# ─── Certificate Generation ──────────────────────────────────────────────────
CERT_SIGNING_KEY=SXXX...      # Key used to sign certificate payloads
CERT_TEMPLATE_DIR=./templates/certificates
CERT_OUTPUT_DIR=/tmp/cv-certs
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable   # set in production
```

### Frontend Environment (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_EXPERT_URL=https://testnet.stellar.expert
NEXT_PUBLIC_CONTRACT_CREDIT_REGISTRY=CXXX...
NEXT_PUBLIC_CONTRACT_MARKETPLACE=CZZZ...
NEXT_PUBLIC_CONTRACT_RETIREMENT=CYYY...
```

> **Security note:** Never commit `.env` files containing secret keys. In production, use AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault. Rotate all keys immediately if compromised. On mainnet, `STELLAR_ADMIN_SECRET_KEY` must never exist in any environment file — use HSM-backed key management with multi-sig ceremonies.

---

## Smart Contracts

All contracts are written in Rust using the Soroban SDK and compile to WASM. They are deployed on Stellar's Soroban execution environment.

### CreditRegistry Contract

The core registry maintains the authoritative on-chain record of all credits.

```rust
use soroban_sdk::{contract, contractimpl, Address, Env, String, BytesN, Vec};
use crate::types::{CreditMetadata, CreditStatus, ApprovalRecord};

#[contract]
pub struct CreditRegistry;

#[contractimpl]
impl CreditRegistry {

    /// Submit a new credit for verifier review.
    /// Returns the assigned credit_id (monotonically increasing u64).
    /// Emits: CreditSubmitted { credit_id, issuer, ipfs_hash }
    pub fn submit_credit(
        env: Env,
        issuer: Address,
        metadata: CreditMetadata,
        ipfs_hash: String,
    ) -> u64;

    /// Called by a registered verifier to approve a pending credit.
    /// If approval threshold is met, the credit is automatically minted.
    /// Emits: CreditApproved | CreditMinted
    pub fn approve_and_mint(
        env: Env,
        verifier: Address,
        credit_id: u64,
        comments: String,
    ) -> Option<BytesN<32>>;       // Returns token_id on mint, None if threshold unmet

    /// Called by a registered verifier to reject a pending credit.
    /// If rejection threshold is met, credit is permanently invalidated.
    /// Emits: CreditRejected { credit_id, verifier, reason }
    pub fn reject_credit(
        env: Env,
        verifier: Address,
        credit_id: u64,
        reason: String,
    ) -> bool;

    /// Transfer ownership of a minted, non-retired credit.
    /// Requires authorization from `from` address.
    /// Emits: CreditTransferred { credit_id, from, to, timestamp }
    pub fn transfer_credit(
        env: Env,
        from: Address,
        to: Address,
        credit_id: u64,
    ) -> bool;

    /// Return full metadata + current status for a credit.
    pub fn get_credit(
        env: Env,
        credit_id: u64,
    ) -> CreditMetadata;

    /// Return complete ownership history as an ordered list of transfers.
    pub fn get_provenance(
        env: Env,
        credit_id: u64,
    ) -> Vec<ApprovalRecord>;

    /// Return all credits issued by a project address.
    pub fn get_credits_by_issuer(
        env: Env,
        issuer: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<u64>;

    /// Return current owner of a credit.
    pub fn get_owner(
        env: Env,
        credit_id: u64,
    ) -> Address;

    /// Return credits owned by an address.
    pub fn get_credits_by_owner(
        env: Env,
        owner: Address,
    ) -> Vec<u64>;
}
```

**CreditMetadata Type**

```rust
#[contracttype]
pub struct CreditMetadata {
    pub project_id: String,          // e.g. "AMZ-REF-001"
    pub methodology: String,         // e.g. "VCS:VM0007", "GS:AR-ACM0003"
    pub vintage_start: u32,          // Unix timestamp (start of crediting period)
    pub vintage_end: u32,            // Unix timestamp (end of crediting period)
    pub tonnes: i128,                // Total tonnes CO2e (in millitonnes; divide by 1000)
    pub geography: String,           // ISO 3166-1 alpha-2 country code
    pub serial_prefix: String,       // Registry-aligned serial number prefix
    pub sdg_flags: u32,              // Bitmask of SDG co-benefits (SDG 1–17)
    pub permanence_rating: u8,       // 0–100; influences buffer pool contribution
    pub buffer_contribution_pct: u8, // Percentage allocated to buffer pool (0–20)
    pub additionality_type: u8,      // 0=regulatory, 1=investment, 2=common_practice
    pub ipfs_hash: String,           // CIDv1 of MRV documentation bundle
    pub status: CreditStatus,        // Pending | Active | Retired | Rejected | Bridged
    pub created_at: u64,             // Ledger timestamp
    pub token_id: Option<BytesN<32>>, // Set after minting
}
```

---

### RetirementTracker Contract

```rust
#[contractimpl]
impl RetirementTracker {

    /// Permanently retire a credit. Burns the token; operation is irreversible.
    /// Requires authorization from current owner.
    /// Emits: CreditRetired { credit_id, owner, beneficiary, reason, timestamp }
    pub fn retire(
        env: Env,
        owner: Address,
        credit_id: u64,
        reason: String,           // e.g. "Scope 1 offset - FY2024"
        beneficiary: String,      // Name of the entity claiming the offset
        accounting_period: String, // e.g. "2024-01-01/2024-12-31"
    ) -> RetirementRecord;

    /// Retire multiple credits in a single transaction.
    /// All-or-nothing: reverts if any single retirement fails.
    pub fn batch_retire(
        env: Env,
        owner: Address,
        retirements: Vec<RetirementRequest>,
    ) -> Vec<RetirementRecord>;

    /// Check if a credit has been retired.
    pub fn is_retired(env: Env, credit_id: u64) -> bool;

    /// Return the full retirement record for a retired credit.
    pub fn get_retirement_record(
        env: Env,
        credit_id: u64,
    ) -> Option<RetirementRecord>;

    /// Return all retirement records for a beneficiary name (case-insensitive).
    pub fn get_retirements_by_beneficiary(
        env: Env,
        beneficiary: String,
        offset: u32,
        limit: u32,
    ) -> Vec<RetirementRecord>;
}

#[contracttype]
pub struct RetirementRecord {
    pub credit_id: u64,
    pub retired_by: Address,
    pub beneficiary: String,
    pub reason: String,
    pub accounting_period: String,
    pub tonnes_retired: i128,       // In millitonnes
    pub tx_hash: BytesN<32>,        // Stellar transaction hash
    pub ledger_sequence: u32,
    pub timestamp: u64,
    pub certificate_hash: Option<BytesN<32>>, // Set when PDF is generated
}
```

---

### Marketplace Contract

```rust
#[contractimpl]
impl Marketplace {

    /// Create a sell offer. Credit must be owned by seller and not retired.
    /// Credit is escrowed in the contract until offer is filled or cancelled.
    /// Emits: OfferCreated { offer_id, seller, credit_id, price, amount }
    pub fn create_offer(
        env: Env,
        seller: Address,
        credit_id: u64,
        price_per_tonne: i128,   // In stroops (1 XLM = 10,000,000 stroops)
        amount: i128,            // Tonnes to sell (in millitonnes)
        currency: Address,       // XLM asset address or USDC contract address
        expiry: Option<u64>,     // Optional Unix timestamp; None = no expiry
    ) -> u64;                    // Returns offer_id

    /// Purchase credits from an existing offer (full or partial fill).
    /// Payment is atomic with ownership transfer.
    /// Emits: TradeFilled { offer_id, buyer, amount, total_price }
    pub fn buy_credits(
        env: Env,
        buyer: Address,
        offer_id: u64,
        amount: i128,
    ) -> bool;

    /// Cancel an existing offer. Returns escrowed credit to seller.
    /// Can only be called by seller or after expiry by anyone.
    pub fn cancel_offer(
        env: Env,
        caller: Address,
        offer_id: u64,
    ) -> bool;

    /// Return a paginated list of active offers with optional filters.
    pub fn get_listings(
        env: Env,
        methodology_filter: Option<String>,
        geography_filter: Option<String>,
        max_price: Option<i128>,
        offset: u32,
        limit: u32,
    ) -> Vec<Offer>;

    /// Return full detail of a single offer.
    pub fn get_offer(env: Env, offer_id: u64) -> Offer;

    /// Return all offers created by a seller.
    pub fn get_offers_by_seller(env: Env, seller: Address) -> Vec<u64>;
}
```

---

### MerkleBridge Contract

```rust
#[contractimpl]
impl MerkleBridge {

    /// Bridge a credit from a legacy registry onto Stellar.
    /// Requires a valid Merkle inclusion proof against the registry's published root.
    /// Emits: CreditBridged { source_registry, source_serial, stellar_credit_id }
    pub fn bridge_in(
        env: Env,
        bridger: Address,
        source_registry: String,    // "VERRA" | "GOLD_STANDARD" | "CDM" | "ACR" | "CAR"
        source_serial: String,      // Original registry serial number
        merkle_proof: Vec<BytesN<32>>,
        merkle_root: BytesN<32>,
        metadata: CreditMetadata,
    ) -> u64;                       // Returns new stellar credit_id

    /// Bridge a credit back to the legacy registry (for retirement there).
    /// Burns the Stellar token and records the bridge-out on-chain.
    pub fn bridge_out(
        env: Env,
        owner: Address,
        credit_id: u64,
    ) -> bool;

    /// Verify a Merkle proof against a known registry root.
    pub fn verify_proof(
        env: Env,
        leaf: BytesN<32>,
        proof: Vec<BytesN<32>>,
        root: BytesN<32>,
    ) -> bool;

    /// Update the Merkle root for a registry (called by the root oracle, multi-sig).
    pub fn update_registry_root(
        env: Env,
        admin: Address,
        registry: String,
        new_root: BytesN<32>,
        block_height: u64,
    ) -> bool;
}
```

---

## Backend API

**Base URL (Testnet):** `https://api-testnet.carbonveritas.io/v1`
**Base URL (Mainnet):** `https://api.carbonveritas.io/v1`

All endpoints require `Authorization: Bearer <JWT>` unless marked `[public]`.
JWT tokens are obtained via SEP-10 wallet authentication (see [Authentication](#authentication--authorization)).

Full OpenAPI specification: `https://api.carbonveritas.io/v1/openapi.json`
Interactive Swagger UI: `https://api.carbonveritas.io/v1/docs`

---

### Credits

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/credits` | Public | List credits (paginated, filterable) |
| GET | `/credits/:id` | Public | Get credit with full provenance |
| POST | `/credits/issue` | Required | Submit new credit for verifier approval |
| POST | `/credits/:id/approve` | Verifier | Approve a pending credit |
| POST | `/credits/:id/reject` | Verifier | Reject a pending credit with reason |
| POST | `/credits/:id/retire` | Owner | Permanently retire a credit |
| GET | `/credits/:id/provenance` | Public | Complete ownership history |
| GET | `/credits/:id/certificate` | Public | Retrieve retirement certificate metadata |
| GET | `/credits/owned` | Required | Credits owned by authenticated wallet |

**GET /credits Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `methodology` | string | Filter by methodology code (e.g. `VCS`, `GS`, `CDM`) |
| `geography` | string | ISO 3166-1 alpha-2 country code |
| `vintage_min` | number | Minimum vintage year |
| `vintage_max` | number | Maximum vintage year |
| `status` | string | `pending` \| `active` \| `retired` |
| `issuer` | string | Stellar public key of issuer |
| `owner` | string | Stellar public key of current owner |
| `page` | number | Page number (default: 1) |
| `limit` | number | Page size (default: 20, max: 100) |
| `sort` | string | `created_asc` \| `created_desc` \| `vintage_asc` |

**POST /credits/issue Request Body**

```json
{
  "projectId": "AMZ-REF-001",
  "methodology": "VCS:VM0007",
  "vintageStart": "2023-01-01",
  "vintageEnd": "2023-12-31",
  "tonnes": 10000,
  "geography": "BR",
  "documentation": {
    "mrvReport": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "projectDesignDocument": "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
    "verificationReport": "ipfs://bafybeif4fcle3vgljfnkzlbdcxfp4hvmtbv3kqfthgxd4hjpfhkjnidka"
  },
  "sdgCobenefits": [1, 6, 13, 15],
  "permanenceRating": 87,
  "additionalityType": "investment_barrier"
}
```

---

### Marketplace

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/marketplace/listings` | Public | Active sell orders (filterable) |
| GET | `/marketplace/listings/:id` | Public | Single offer detail |
| POST | `/marketplace/offer` | Required | Create sell offer |
| POST | `/marketplace/buy/:id` | Required | Execute purchase (full or partial) |
| DELETE | `/marketplace/offer/:id` | Owner | Cancel offer |
| GET | `/marketplace/history` | Required | Authenticated user's trade history |
| GET | `/marketplace/price-history` | Public | Price time series for a methodology |
| GET | `/marketplace/stats` | Public | Volume, VWAP, and open interest |

---

### Verifiers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/verifiers` | Public | List all registered and active verifiers |
| GET | `/verifiers/:id` | Public | Verifier profile and reputation score |
| POST | `/verifiers/register` | Required | Apply to become a verifier (requires stake) |
| GET | `/verifiers/:id/approvals` | Public | Historical approvals and rejections |
| GET | `/verifiers/pending` | Verifier | Credits awaiting this verifier's review |
| POST | `/verifiers/:id/heartbeat` | Verifier | Liveness signal (required every 24h) |

---

### Certificates

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/certificates/:id` | Public | Certificate metadata (JSON) |
| GET | `/certificates/:id/pdf` | Public | Download signed PDF |
| POST | `/certificates/verify` | Public | Verify certificate authenticity via hash |
| POST | `/certificates/batch` | Required | Batch generate certificates |
| GET | `/certificates/owned` | Required | All certificates for authenticated wallet |

---

### Reporting

Export the authenticated wallet's retired credits as a GHG Protocol Scope 3 inventory for ESG and corporate accounting:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reporting/scope3` | Required | Scope 3 inventory as JSON or CSV |

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `format` | `json` \| `csv` | `json` | Response format |
| `year` | number | all | Restrict to retirements in a calendar year |

The JSON report aggregates retirements into a summary (total tonnes retired, retirement count, unique credits, and breakdowns by methodology, geography, and vintage) plus a line-item ledger carrying on-chain identifiers (`txHash`, `ledgerSequence`, `certificateHash`) for auditability. CSV exports are BOM-prefixed for Excel compatibility. Also available from the SDK (`sdk.reporting`), CLI (`cv reporting scope3`), and frontend (`/reporting`).

---

### Merkle Bridge

Import credits from legacy registries (Verra, Gold Standard, CDM, ACR, CAR, Plan Vivo) onto Stellar, and return them for retirement on the source registry:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bridge/in` | Required | Bridge a credit in using a Merkle inclusion proof |
| POST | `/bridge/credits/:creditId/out` | Owner | Bridge a credit back to its source registry |
| GET | `/bridge/records` | Public | Public bridge audit ledger (filterable, paginated) |
| GET | `/bridge/registries/:registry/root` | Public | Published merkle root for a registry |
| POST | `/bridge/registries/:registry/root` | Admin | Publish a new merkle root for a registry |

Every import is verified read-only against the registry's published root before any fee is paid, and the on-chain MerkleBridge contract enforces double-minting prevention by `(registry, serial)`. Bridged credits are minted `ACTIVE` on-chain (inheriting the source registry's verification) and are fully tradable through the marketplace. Also available from the SDK (`sdk.bridge`), CLI (`cv bridge`), and frontend (`/bridge`).

---

### Webhooks

Register webhook endpoints to receive real-time notifications:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/webhooks` | Required | Register a webhook endpoint |
| GET | `/webhooks` | Required | List registered webhooks |
| DELETE | `/webhooks/:id` | Required | Remove a webhook |
| POST | `/webhooks/:id/test` | Required | Send a test event |

**Webhook Event Types**

| Event | Trigger |
|---|---|
| `credit.submitted` | New credit submitted for review |
| `credit.approved` | Verifier approval recorded |
| `credit.minted` | Approval threshold met; credit goes live |
| `credit.rejected` | Credit rejected by verifier quorum |
| `credit.transferred` | Ownership transferred |
| `credit.retired` | Credit permanently retired |
| `offer.created` | New marketplace offer listed |
| `offer.filled` | Offer fully or partially purchased |
| `offer.cancelled` | Offer cancelled or expired |
| `certificate.generated` | PDF certificate generated and stored |

All webhook payloads include a `X-CarbonVeritas-Signature` header (HMAC-SHA256 of the body using the webhook secret) for verification.

---

## Frontend Application

The Next.js 14 frontend provides a full-featured interface for all protocol interactions.

### Pages

| Route | Description |
|---|---|
| `/` | Market overview: live stats, recent retirements, featured projects |
| `/credits` | Browse and filter the credit registry |
| `/credits/[id]` | Credit detail page with provenance graph |
| `/credits/issue` | Multi-step credit issuance wizard |
| `/marketplace` | Order book, price charts, buy/sell interface |
| `/retire` | Credit retirement flow with certificate preview |
| `/certificates/[id]` | Public certificate verification page |
| `/verifier` | Verifier dashboard: pending approvals, reputation |
| `/portfolio` | Wallet portfolio: owned credits, trade history, certificates |
| `/reporting` | GHG Protocol Scope 3 export: summary, breakdowns, JSON/CSV download |
| `/admin` | Admin panel: contract configuration, verifier management |

### Wallet Integration

The frontend integrates with **Freighter** wallet for all on-chain transactions:

```typescript
// lib/freighter.ts

import {
  isConnected,
  getPublicKey,
  signTransaction,
  setAllowed,
} from '@stellar/freighter-api';

export async function connectWallet(): Promise<string> {
  if (!(await isConnected())) {
    throw new Error('Freighter wallet not installed. Visit freighter.app');
  }
  await setAllowed();
  return getPublicKey();
}

export async function signAndSubmit(
  xdr: string,
  network: 'testnet' | 'mainnet'
): Promise<string> {
  const signed = await signTransaction(xdr, {
    network: network === 'testnet' ? 'TESTNET' : 'PUBLIC',
  });
  // Submit to Stellar Horizon
  const server = new StellarSdk.Server(HORIZON_URL);
  const tx = StellarSdk.TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(tx);
  return result.hash;
}
```

---

## SDK Reference

Install the SDK:

```bash
npm install @carbonveritas/sdk
```

### Initialization

```typescript
import { CarbonVeritasClient } from '@carbonveritas/sdk';
import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';

const client = new CarbonVeritasClient({
  network: 'testnet',                              // 'testnet' | 'mainnet'
  apiUrl: 'https://api-testnet.carbonveritas.io',  // optional; defaults to official
  wallet: {
    getPublicKey,
    signTransaction,
  },
});

// Authenticate (triggers SEP-10 challenge/response via Freighter)
await client.auth.connect();
console.log('Connected as:', await client.auth.getAddress());
```

### Credits

```typescript
// Submit a new credit for verifier approval
const credit = await client.credits.submit({
  projectId: 'AMZ-REF-001',
  methodology: 'VCS:VM0007',
  vintageStart: new Date('2024-01-01'),
  vintageEnd: new Date('2024-12-31'),
  tonnes: 10_000,
  geography: 'BR',
  documentation: {
    mrvReport: 'ipfs://bafybei...',
    projectDesignDocument: 'ipfs://bafybei...',
  },
  sdgCobenefits: [13, 15],
  permanenceRating: 87,
});
console.log(`Submitted credit #${credit.id}, status: ${credit.status}`);

// Fetch credit with full provenance
const detail = await client.credits.get(credit.id);
console.log('Current owner:', detail.owner);
console.log('Provenance:', detail.provenance);

// Transfer credit to another address
await client.credits.transfer({
  creditId: credit.id,
  to: 'GDEST...',
});

// List owned credits
const portfolio = await client.credits.listOwned({ page: 1, limit: 50 });
```

### Marketplace

```typescript
// Create a sell offer
const offer = await client.marketplace.createOffer({
  creditId: credit.id,
  amount: 5_000,            // tonnes
  pricePerTonne: 28.50,     // USD
  currency: 'USDC',         // 'XLM' | 'USDC'
  expiresIn: 30 * 24 * 3600, // 30 days in seconds
});
console.log(`Listed offer #${offer.id}`);

// Browse listings
const listings = await client.marketplace.listOffers({
  methodology: 'VCS',
  geography: 'BR',
  maxPrice: 35,
  sort: 'price_asc',
  limit: 20,
});

// Buy credits
const trade = await client.marketplace.buy({
  offerId: offer.id,
  amount: 1_000,
});
console.log(`Trade confirmed: ${trade.txHash}`);

// Cancel an offer
await client.marketplace.cancelOffer(offer.id);
```

### Retirement

```typescript
// Retire credits permanently
const retirement = await client.retirement.retire({
  creditId: credit.id,
  amount: 2_000,
  reason: 'Scope 1 emissions offset — FY2024',
  beneficiary: 'Acme Corporation',
  accountingPeriod: { start: '2024-01-01', end: '2024-12-31' },
});
console.log(`Retired ${retirement.tonnesRetired} tonnes`);
console.log(`Tx hash: ${retirement.txHash}`);

// Batch retire multiple credits
const results = await client.retirement.batchRetire([
  { creditId: 101, amount: 500, reason: '...', beneficiary: '...' },
  { creditId: 102, amount: 750, reason: '...', beneficiary: '...' },
]);

// Check retirement status
const isRetired = await client.retirement.isRetired(credit.id);
```

### Certificates

```typescript
// Generate a PDF retirement certificate
const cert = await client.certificates.generate({
  retirementId: retirement.id,
  format: 'pdf',          // 'pdf' | 'json'
  branding: 'corporate',  // 'default' | 'corporate' | 'minimal'
  language: 'en',
});

// Download the PDF as a Buffer
const pdfBuffer = await client.certificates.download(cert.id);
fs.writeFileSync('./retirement-cert-2024.pdf', pdfBuffer);

// Verify a certificate by hash
const isValid = await client.certificates.verify({
  certId: cert.id,
  hash: cert.hash,
});

// Share on social platforms
await client.certificates.share(cert.id, {
  platforms: ['linkedin', 'twitter'],
  message: 'We offset 2,000 tonnes of CO₂ in 2024 via CarbonVeritas 🌿',
});
```

### Verifier Operations

```typescript
// Approve a pending credit (verifier only)
await client.verifiers.approve({
  creditId: 456,
  comments: 'MRV data verified via satellite imagery and field inspection. Additionality confirmed.',
});

// Reject a credit
await client.verifiers.reject({
  creditId: 789,
  reason: 'Baseline calculation methodology inconsistent with VCS VM0007 requirements.',
});

// Check pending review queue
const pending = await client.verifiers.getPendingCredits();
```

---

## CLI Tool

Install globally:

```bash
npm install -g @carbonveritas/cli
```

### Commands

```bash
# System health check
carbonveritas doctor
# → Checks Node version, Stellar connectivity, API reachability, wallet config

# ─── Credits ──────────────────────────────────────────────────────────────────

# Submit a new credit
carbonveritas credits issue \
  --project "AMZ-001" \
  --tonnes 5000 \
  --methodology "VCS:VM0007" \
  --vintage "2024" \
  --geography "BR" \
  --mrv-doc "ipfs://bafybei..."

# Get credit details
carbonveritas credits get 12345

# List your credits
carbonveritas credits list --owner

# Transfer a credit
carbonveritas credits transfer 12345 --to GDEST...

# ─── Marketplace ──────────────────────────────────────────────────────────────

# List active offers
carbonveritas marketplace list \
  --methodology VCS \
  --sort price \
  --limit 20

# Create a sell offer
carbonveritas marketplace offer \
  --credit 12345 \
  --price 28.50 \
  --amount 1000 \
  --currency USDC

# Buy credits
carbonveritas marketplace buy 67890 --amount 500

# ─── Retirement ───────────────────────────────────────────────────────────────

# Retire a credit
carbonveritas retire \
  --credit 12345 \
  --amount 1000 \
  --beneficiary "Acme Corp" \
  --reason "Scope 1 FY2024" \
  --output ./acme-cert-2024.pdf

# Batch retire from CSV
carbonveritas retire --batch ./retirements.csv --output-dir ./certs/

# Verify a certificate
carbonveritas verify ./acme-cert-2024.pdf
# → ✅ Valid  |  Retired: 1000 tCO₂e  |  Tx: abc123...  |  Block: 12345678

# ─── Verifier Operations ──────────────────────────────────────────────────────

# List pending approvals
carbonveritas verifier pending

# Approve a credit
carbonveritas verifier approve 456 \
  --comments "MRV verified via satellite + field inspection"

# Reject a credit
carbonveritas verifier reject 789 \
  --reason "Baseline calculation error"

# ─── Bridge ───────────────────────────────────────────────────────────────────

# Bridge a Verra credit onto Stellar
carbonveritas bridge in \
  --registry VERRA \
  --serial "VCS-12345-2024" \
  --proof ./merkle-proof.json

# Bridge a credit back to Verra
carbonveritas bridge out --credit 99999
```

---

## Data Models

### Database Schema (Prisma)

```prisma
model Credit {
  id                  Int               @id @default(autoincrement())
  stellarCreditId     BigInt            @unique
  projectId           String
  methodology         String
  vintageStart        DateTime
  vintageEnd          DateTime
  tonnes              Decimal           @db.Decimal(18, 3)
  geography           String            @db.Char(2)
  status              CreditStatus
  issuerAddress       String
  ownerAddress        String
  ipfsHash            String
  sdgFlags            Int               @default(0)
  permanenceRating    Int
  bufferPct           Int
  additionalityType   AdditionalityType
  txHash              String?
  ledgerSequence      Int?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  provenance          ProvenanceEntry[]
  approvals           VerifierApproval[]
  offers              MarketplaceOffer[]
  retirement          RetirementRecord?
  certificate         Certificate?

  @@index([ownerAddress])
  @@index([methodology, vintageStart])
  @@index([geography, status])
}

model RetirementRecord {
  id                  Int       @id @default(autoincrement())
  credit              Credit    @relation(fields: [creditId], references: [id])
  creditId            Int       @unique
  retiredBy           String
  beneficiary         String
  reason              String
  accountingStart     DateTime
  accountingEnd       DateTime
  tonnesRetired       Decimal   @db.Decimal(18, 3)
  txHash              String    @unique
  ledgerSequence      Int
  retiredAt           DateTime
  certificate         Certificate?
}

model MarketplaceOffer {
  id                  Int           @id @default(autoincrement())
  stellarOfferId      BigInt        @unique
  credit              Credit        @relation(fields: [creditId], references: [id])
  creditId            Int
  sellerAddress       String
  pricePerTonne       Decimal       @db.Decimal(18, 7)
  currency            String        @db.Char(4)
  amountTotal         Decimal       @db.Decimal(18, 3)
  amountRemaining     Decimal       @db.Decimal(18, 3)
  status              OfferStatus
  expiresAt           DateTime?
  createdAt           DateTime      @default(now())
  trades              Trade[]

  @@index([sellerAddress])
  @@index([status, currency])
}

model Verifier {
  id                  Int                @id @default(autoincrement())
  stellarAddress      String             @unique
  name                String
  organization        String
  accreditations      String[]
  stakedAmount        Decimal            @db.Decimal(18, 7)
  reputationScore     Float              @default(100.0)
  isActive            Boolean            @default(true)
  registeredAt        DateTime           @default(now())
  lastHeartbeat       DateTime

  approvals           VerifierApproval[]

  @@index([isActive, reputationScore])
}
```

---

## Authentication & Authorization

### SEP-10 Wallet Authentication

CarbonVeritas implements [SEP-10](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md), the Stellar Web Authentication standard. There are no passwords.

**Flow:**

```
Client                          Server (SEP-10 endpoint)
  │                                     │
  │  GET /auth?account=GPUB...          │
  │  ──────────────────────────────►    │
  │                                     │  Generate challenge transaction
  │                                     │  (signed by server SEP-10 key)
  │  ◄──────────────────────────────    │
  │  { transaction: "AAQAAAA..." }      │
  │                                     │
  │  User signs via Freighter wallet    │
  │                                     │
  │  POST /auth                         │
  │  { transaction: "<signed XDR>" }    │
  │  ──────────────────────────────►    │
  │                                     │  Verify signature
  │                                     │  Issue JWT (24h expiry)
  │  ◄──────────────────────────────    │
  │  { token: "eyJhbGci..." }           │
  │                                     │
```

### Role-Based Access Control

| Role | Capabilities |
|---|---|
| `PUBLIC` | Read all credits, marketplace, certificates; verify certificates |
| `USER` | All public + issue credits, trade, retire, generate certificates |
| `VERIFIER` | All user + approve/reject credits; requires staked XLM |
| `PROJECT_DEVELOPER` | All user + access to expanded project management tools |
| `ADMIN` | All operations + contract parameter updates; requires multi-sig |

---

## Certificate System

Retirement certificates are cryptographically bound to the underlying Stellar transaction:

### Certificate Lifecycle

```
Retirement TX confirmed on Stellar
           │
           ▼
Certificate request received (API or SDK)
           │
           ▼
Fetch retirement record from chain
           │
           ▼
Render HTML template (Handlebars) with:
  · Credit metadata
  · Retirement details
  · QR code → Stellar Expert TX link
  · Verifier signatures
           │
           ▼
Generate PDF/A-3 via Puppeteer
  · Embed XML payload (machine-readable)
  · Embed signature block
           │
           ▼
Sign certificate payload:
  hash = SHA-256(PDF bytes)
  signature = ECDSA(hash, CERT_SIGNING_KEY)
           │
           ▼
Store on IPFS (Pinata)
Store hash on-chain (RetirementTracker)
           │
           ▼
Return certificate URL + hash to client
```

### Verification

Anyone can verify a certificate:

```bash
# Via CLI
carbonveritas verify ./certificate.pdf

# Via API
curl -X POST https://api.carbonveritas.io/v1/certificates/verify \
  -H "Content-Type: application/json" \
  -d '{ "certId": "cv-cert-12345", "hash": "abc123..." }'
# → { "valid": true, "txHash": "...", "retiredAt": "...", "tonnes": 1000 }

# Via QR code
# Scan the QR code embedded in the PDF → opens Stellar Expert transaction page
```

---

## Merkle Bridge

The Merkle Bridge allows credits from legacy registries to be ported onto Stellar with cryptographic proofs, preventing double-counting.

### How It Works

```
Verra Registry                    CarbonVeritas Bridge Oracle
       │                                     │
       │  Daily: publish Merkle root         │
       │  of all active serial numbers       │
       ──────────────────────────────────►   │
                                             │  Store root on-chain
                                             │  (multi-sig update)
                                             │

Project Developer
       │
       │  1. Obtain Merkle inclusion proof from Verra API
       │     (proves serial X is in registry at block H)
       │
       │  2. Call bridge_in(proof, root, metadata)
       │
       │  3. Contract verifies:
       │     · proof is valid against stored root
       │     · serial not already bridged (dedup index)
       │     · metadata matches registry record
       │
       │  4. If valid: mint Stellar token + record bridge
       │  5. Verra serial added to dedup index
       │
       ▼
    Credit live on Stellar
```

> **Important:** The bridge oracle (publishing Merkle roots) is the main trust assumption of the bridge. In Q3 2026, this transitions to a decentralized oracle network.

---

## Revenue Distribution

The RevenueSplit contract atomically distributes proceeds at trade settlement.

### Configuration

```typescript
// Configure revenue split for a credit series (called by project developer at issuance)
await client.revenueSplit.configure({
  creditId: credit.id,
  recipients: [
    { address: 'GDEVELOPER...', bps: 6000 },   // 60% — project developer
    { address: 'GLANDOWNER...', bps: 2000 },   // 20% — landowner
    { address: 'GCOMMUNITY...', bps: 1000 },   // 10% — local community fund
    { address: 'GBUFFER......', bps: 500  },   //  5% — buffer pool (protocol-managed)
    // Remaining 500 bps (5%) → protocol fee address (set by governance)
  ],
});
```

Splits are enforced at settlement. If any transfer fails (e.g. account has no trustline), the entire transaction reverts. Recipients must establish trustlines for USDC if settling in USDC.

---

## Testing

### Smart Contract Tests (Rust)

```bash
cd contracts

# Run all unit tests
cargo test

# Run with output (useful for debugging)
cargo test -- --nocapture

# Run a specific test
cargo test test_retire_permanent

# Run integration tests (requires local Soroban simulator)
cargo test --test integration

# Generate coverage report
cargo tarpaulin --out Html --output-dir ./coverage
```

### Backend Tests (NestJS)

```bash
# Unit tests
npm run test:api

# Integration tests (requires running Docker infrastructure)
npm run test:api:integration

# E2E tests (requires full stack: API + testnet contracts)
npm run test:api:e2e

# With coverage report
npm run test:api:coverage
# → Generates ./coverage/index.html

# Watch mode (development)
npm run test:api:watch
```

### Frontend Tests (Playwright)

```bash
# Install browsers
npx playwright install

# Run E2E tests
npm run test:frontend

# Run in headed mode (visible browser)
npm run test:frontend:headed

# Run specific test file
npx playwright test marketplace.spec.ts

# Generate trace for debugging
npx playwright test --trace on
```

### Load Testing

```bash
# Run load test (k6)
npm run test:load -- --users 1000 --duration 60

# Simulate marketplace surge
npm run test:load:marketplace -- --tps 500 --duration 300

# Simulate retirement batch
npm run test:load:retirement -- --batch-size 1000
```

### Test Coverage Summary

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `contracts/credit-registry` | 97% | 94% | 100% | 97% |
| `contracts/retirement-tracker` | 98% | 96% | 100% | 98% |
| `contracts/marketplace` | 95% | 91% | 100% | 95% |
| `contracts/merkle-bridge` | 92% | 88% | 96% | 92% |
| `api` | 94% | 89% | 97% | 94% |
| `sdk` | 91% | 87% | 95% | 91% |
| **Overall** | **94%** | **91%** | **98%** | **94%** |

---

## Deployment

### Testnet Deployment

```bash
# Full testnet deploy (from scratch)
./scripts/deploy-testnet.sh

# Re-deploy a single contract (e.g. after a bug fix)
cd contracts/marketplace
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/marketplace.wasm \
  --source $STELLAR_ADMIN_SECRET_KEY \
  --rpc-url $STELLAR_SOROBAN_RPC \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE"
```

### Mainnet Deployment (Multi-Sig Required)

Mainnet contract deployments require 3-of-5 admin signatures. The process:

```bash
# 1. Prepare the deployment transaction (any admin)
./scripts/prepare-mainnet-deploy.sh --contract marketplace

# 2. Collect signatures from 3 keyholders (out-of-band)
./scripts/collect-signatures.sh --tx-file ./pending-deploy.xdr

# 3. Submit once threshold is met
./scripts/submit-deployment.sh --tx-file ./signed-deploy.xdr

# 4. Verify deployment
soroban contract invoke \
  --id $CONTRACT_MARKETPLACE \
  --network mainnet \
  -- version
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml (excerpt)
services:
  api:
    image: ghcr.io/carbonveritas/api:${VERSION}
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      STELLAR_NETWORK: mainnet
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  indexer:
    image: ghcr.io/carbonveritas/indexer:${VERSION}
    environment:
      HORIZON_URL: https://horizon.stellar.org
      SYNC_FROM_LEDGER: ${GENESIS_LEDGER}
    deploy:
      replicas: 1   # Must be singleton; manages sync cursor
```

### CI/CD Pipeline

Every pull request triggers:
1. `cargo test` — All smart contract tests
2. `cargo clippy` — Rust linting
3. `cargo audit` — Dependency vulnerability scan
4. `npm run test:api` — Backend tests with coverage gate (90%)
5. `npm run lint` — TypeScript linting (ESLint + Prettier)
6. `npm audit` — Node dependency scan
7. `npm run test:frontend` — Playwright E2E tests

Merges to `main` additionally trigger:
- Automatic deployment to testnet
- Docker image build + push to GHCR
- Semantic release version bump

---

## Security

### Audit Status

| Contract | Auditor | Scope | Status | Report |
|---|---|---|---|---|
| CreditRegistry | Trail of Bits | Full | ✅ Complete (Dec 2025) | [View](docs/audits/trail-of-bits-credit-registry.pdf) |
| RetirementTracker | Sigma Prime | Full | ✅ Complete (Dec 2025) | [View](docs/audits/sigma-prime-retirement.pdf) |
| Marketplace | Hacken | Full | 🔄 In Progress (Q1 2026) | Pending |
| MerkleBridge | Certora | Formal Verification | 📅 Scheduled (Q2 2026) | Pending |
| RevenueSplit | OtterSec | Full | 📅 Scheduled (Q2 2026) | Pending |
| VerifierStake | Trail of Bits | Full | 📅 Scheduled (Q2 2026) | Pending |

### Security Features

**Client-Side Signing**
No secret keys ever touch the backend. All transactions are assembled server-side and returned as unsigned XDR for the user's Freighter wallet to sign. The backend cannot move funds unilaterally.

**Replay Protection**
All contract operations include nonce-based replay protection. The Stellar transaction's `sequence_number` makes each transaction unique. Contract operations include an additional `operation_id` for idempotency.

**Immutable Audit Logs**
No `DELETE` functions exist on `RetirementTracker` or `CreditRegistry`. Once written, retirement records and provenance entries are permanent.

**Rate Limiting**
All API endpoints are rate-limited per wallet address:
- Standard endpoints: 100 req/min
- Write endpoints: 10 req/min
- Batch endpoints: 1 req/min

**Multi-Sig Admin**
All protocol-level operations (fee changes, contract upgrades, verifier slashing) require 3-of-5 admin signatures using Stellar's native multi-sig.

**Verifier Staking**
Verifiers must stake a minimum of 10,000 XLM. Staked funds are subject to slashing (via `verifier-stake` contract) if a verifier approves fraudulent credits. This creates a strong economic disincentive against collusion.

**Dependency Auditing**
- `cargo audit` runs nightly against Rust dependencies
- `npm audit` runs nightly against Node dependencies
- Dependabot is enabled for automated patch PRs

### Responsible Disclosure

If you discover a security vulnerability, please report it privately to **security@carbonveritas.io**. Do **not** open a public GitHub issue. See [SECURITY.md](SECURITY.md) for the full disclosure policy and PGP key.

We operate a bug bounty program:
- **Critical** (fund loss, double-mint): up to $50,000 USDC
- **High** (data integrity, auth bypass): up to $15,000 USDC
- **Medium** (denial of service, info leak): up to $3,000 USDC

---

## Performance & Scalability

### Benchmarks (Testnet, Q4 2025)

| Operation | Median Latency | P99 Latency | TPS (sustained) |
|---|---|---|---|
| Credit submission | 1.2s | 3.1s | 50 |
| Verifier approval | 0.9s | 2.4s | 80 |
| Credit transfer | 0.8s | 2.1s | 120 |
| Marketplace buy | 1.1s | 2.8s | 90 |
| Retirement | 0.9s | 2.3s | 100 |
| Certificate generation | 2.4s | 5.2s | 40 |
| API read (cached) | 8ms | 45ms | 5,000+ |
| API read (uncached) | 65ms | 180ms | 800 |

Stellar's SCP consensus provides ~5-second ledger close times. On-chain operations (submit, approve, transfer, retire) are finalized within one ledger close with no probabilistic finality risk.

### Horizontal Scaling

The API tier is stateless and scales horizontally behind an ALB. The indexer is a singleton (stateful sync cursor) — scale vertically or use read replicas for query load. Redis is used for both API response caching (TTL: 30s for listings; 5m for credit detail) and the BullMQ job queue for certificate generation.

---

## Monitoring & Observability

### Health Checks

```bash
# API liveness
GET /health
→ { "status": "ok", "uptime": 86400, "version": "1.0.3" }

# Dependency health
GET /health/detailed
→ {
    "database": "ok",
    "redis": "ok",
    "stellar": "ok",
    "ipfs": "ok",
    "contracts": {
      "creditRegistry": "ok",
      "marketplace": "ok",
      "retirement": "ok"
    }
  }

# Indexer sync status
GET /indexer/status
→ { "latestIndexedLedger": 12345678, "stellarLatestLedger": 12345680, "lag": 2 }
```

### Metrics (Datadog)

Key dashboards:

- **Protocol Health**: Credits issued/day, retirements/day, bridge volume
- **Marketplace**: Volume, VWAP, open interest, fill rate
- **Verifier Network**: Pending approvals, median approval time, rejection rate
- **API Performance**: Request rate, error rate, P99 latency by endpoint
- **Infrastructure**: ECS CPU/memory, RDS connections, cache hit rate

Alerts are configured via PagerDuty for:
- API error rate > 1% (P2)
- Indexer lag > 10 ledgers (P2)
- Verifier heartbeat missing > 48h (P3)
- Smart contract invocation failure rate > 5% (P1)

---

## Roadmap

### ✅ Completed (Q4 2025)

- Core smart contracts: CreditRegistry and RetirementTracker
- SEP-10 wallet authentication
- IPFS metadata integration (Pinata)
- Testnet deployment
- Trail of Bits audit (CreditRegistry)
- Sigma Prime audit (RetirementTracker)
- CLI tool v1.0
- SDK v1.0 (`@carbonveritas/sdk`)
- 94% test coverage

### ✅ Completed (Q1–Q2 2026)

- Next.js frontend application
- Retirement certificate PDF generator
- Verifier dashboard
- VerifierStake contract
- GHG Protocol Scope 3 export format (API, SDK, CLI, and frontend)

### 🔄 In Progress (Q2 2026)

- Marketplace contract + Stellar DEX integration
- Hacken audit (Marketplace)
- Live demo environment (`testnet.carbonveritas.io`)
- Documentation site (`docs.carbonveritas.io`)

### 📅 Planned (Q3 2026)

- MerkleBridge for Verra and Gold Standard credits
- RevenueSplit automated distribution
- Mobile app (React Native + Expo)
- Certora formal verification (MerkleBridge)
- Mainnet launch
- Corporate bulk API (rate limits 10×)
- CORSIA methodology flags

### 🗺️ Future (Q3–Q4 2026)

- DAO governance for protocol parameters (fee, thresholds, verifier slashing)
- Carbon futures and options (structured products layer)
- Integration with Regen Network for crosschain credits
- Decentralized oracle network for Merkle root updates
- DMRV (digital MRV) integration with IoT and satellite data providers
- Article 6.4 mechanism compatibility (Paris Agreement)
- White-label API for corporate sustainability platforms

---

## Contributing

We welcome contributions of all kinds — smart contract improvements, backend features, frontend polish, documentation, and bug reports.

### Before You Start

Read [CONTRIBUTING.md](CONTRIBUTING.md) in full. Key points:

- **Smart contract changes** require an architectural discussion in a GitHub Issue before implementation. Contract bugs can be irreversible on mainnet.
- **Security issues** go to security@carbonveritas.io, not GitHub Issues.
- **All contributions** must pass CI (tests, lint, coverage gate) before review.

### Contribution Workflow

```bash
# 1. Fork the repo and create a feature branch
git clone https://github.com/YOUR-USERNAME/carbonveritas
cd carbonveritas
git checkout -b feat/your-feature-name

# 2. Install dependencies and verify baseline tests pass
npm install
npm test

# 3. Make your changes
# For smart contract changes: cd contracts && cargo test
# For API changes: npm run test:api
# For frontend changes: npm run test:frontend

# 4. Run pre-commit checks
npm run precommit
# → Runs: lint, format, type-check, unit tests

# 5. Commit using Conventional Commits format
git commit -m "feat(marketplace): add partial fill support for large orders"
#                ──────────────    ─────────────────────────────────────────
#                scope (optional)  description in imperative mood

# 6. Push and open a pull request
git push origin feat/your-feature-name
# Open PR against `main` using the PR template
```

### Commit Convention

| Type | Use For |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or fixing tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Build system, dependency updates |
| `security` | Security-related fixes |

### Development Standards

**Smart Contracts**
- Every public function must have a corresponding unit test
- Error codes must be in the 100–599 range and documented in `shared/src/errors.rs`
- No `unwrap()` in production code — use `?` or explicit `match`
- All storage operations must handle the case where the key does not exist

**Backend**
- TypeScript strict mode (`"strict": true` in tsconfig)
- 90%+ test coverage on all new modules
- All endpoints must have OpenAPI decorators (`@ApiOperation`, `@ApiResponse`)
- Database queries via Prisma only — no raw SQL

**Frontend**
- WCAG 2.1 AA accessibility compliance required
- All interactive elements must be keyboard-navigable
- Lighthouse performance score ≥ 90

---

## Governance

Protocol parameters are currently controlled by the founding team's 3-of-5 admin multi-sig. In Q3 2026, governance transitions to a DAO using Stellar's native asset voting.

**Governable Parameters:**
- Protocol fee (currently 50 bps)
- Verifier stake minimum (currently 10,000 XLM)
- Verifier approval threshold (currently 2-of-3)
- Verifier approval window (currently 168 hours)
- Buffer pool reserve ratio
- Supported bridge registries
- Emergency pause authority

**Governance Proposals:**
All parameter changes go through a 7-day community discussion period followed by a 72-hour on-chain vote. Changes require a 10% quorum and 67% supermajority.

---

## Community & Support

| Channel | Link | Purpose |
|---|---|---|
| 📚 Documentation | [docs.carbonveritas.io](https://docs.carbonveritas.io) | Full technical docs, guides, tutorials |
| 💬 Discord | [discord.gg/carbonveritas](https://discord.gg/carbonveritas) | Real-time support, dev discussion, announcements |
| 🐦 Twitter / X | [@carbonveritas](https://twitter.com/carbonveritas) | Announcements, ecosystem news |
| 📧 General Email | hello@carbonveritas.io | Partnerships, media, general inquiries |
| 🔒 Security Email | security@carbonveritas.io | Vulnerability reports (private) |
| 🐛 Bug Reports | [GitHub Issues](https://github.com/your-org/carbonveritas/issues) | Bug reports, feature requests |
| 📖 Blog | [blog.carbonveritas.io](https://blog.carbonveritas.io) | Deep dives, release notes, protocol updates |

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for the full text.

Smart contract bytecode deployed on Stellar Mainnet is additionally governed by the **CarbonVeritas Protocol License**, which prohibits deploying modified contracts under the CarbonVeritas name or claiming CarbonVeritas certification for credits not issued through the official protocol.

---

## Acknowledgments

- **[Stellar Development Foundation](https://stellar.org)** — Soroban smart contract platform and ongoing developer support
- **[Verra](https://verra.org)** and **[Gold Standard](https://www.goldstandard.org)** — Methodology guidance and registry integration support
- **[Trail of Bits](https://www.trailofbits.com)** — Smart contract security audit
- **[Sigma Prime](https://sigmaprime.io)** — Smart contract security audit
- All contributors and community members who have filed issues, submitted PRs, and provided feedback

---

<div align="center">

**Built on Stellar. Verified on Soroban. Committed to our planet.**

[Report Bug](https://github.com/your-org/carbonveritas/issues/new?template=bug_report.md) · [Request Feature](https://github.com/your-org/carbonveritas/issues/new?template=feature_request.md) · [Read Docs](https://docs.carbonveritas.io) · [Join Discord](https://discord.gg/carbonveritas)

---

*CarbonVeritas is a registered trademark of the CarbonVeritas Foundation.*
*Carbon credits retired through CarbonVeritas are independently verifiable on the Stellar blockchain.*

</div>

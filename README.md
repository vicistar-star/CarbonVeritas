# CarbonVeritas 🌿

### *Verifiable Carbon Credits. Immutable Climate Action. Transparent Markets.*

[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-000000?logo=stellar&style=for-the-badge)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-FF4C8B?style=for-the-badge)](https://soroban.stellar.org)
[![License](https://img.shields.io/badge/License-MIT-36A2EF?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-00C853?style=for-the-badge)](#)
[![Codecov](https://img.shields.io/badge/Coverage-94%25-00C853?style=for-the-badge)](#)

---

## The Problem CarbonVeritas Solves

Carbon markets are broken. Trust is low. Fraud is high. Double-counting runs rampant. Verification is opaque. Retirement certificates are easily forged.

**CarbonVeritas fixes this.**

By building on Stellar Soroban, we create an immutable, transparent, and tamper-proof carbon credit ecosystem where every credit is traceable, every retirement is permanent, and every transaction is verifiable by anyone.

---

## Why CarbonVeritas?

| Challenge | Traditional Market | CarbonVeritas Solution |
|-----------|-------------------|------------------------|
| **Double Counting** | Common, hard to detect | Impossible — on-chain ledger prevents reuse |
| **Verification** | Opaque, expensive | Transparent, cryptographic proofs |
| **Retirement** | Paper certificates can be forged | Immutable on-chain records + QR-verified PDFs |
| **Settlement** | Weeks to months | Seconds via Stellar blockchain |
| **Fees** | High intermediary costs | Minimal — 0.00001 XLM per transaction |
| **Access** | Institutional only | Anyone with a Stellar wallet |

---

## 🚀 Live Demo

> *Coming soon — Testnet deployment active Q1 2026*

```bash
# Try the CLI demo right now
git clone https://github.com/your-org/carbonveritas
cd carbonveritas
./scripts/demo.sh

# Connect with Freighter wallet
# Visit: https://testnet.carbonveritas.io
Core Features
🔒 Immutable Credit Registry
Every carbon credit is tokenized as a unique Soroban asset with complete provenance — issuance date, methodology, vintage, geography, and verification signatures permanently on-chain.

✅ Multi-Sig Verifier Approval
No credit is minted without cryptographic approval from multiple independent verifiers. Distributed trust, not centralized control.

🔥 Tamper-Proof Retirement
Once retired, a credit is permanently burned. The retirement record lives forever on Stellar — no takebacks, no double-spending, no fraud.

📊 P2P Marketplace
Trade credits directly with anyone on Stellar's native DEX. No intermediaries. No hidden fees. Full price discovery.

🌐 Merkle Bridge to Legacy Registries
Bridge existing Verra, Gold Standard, and CDM credits onto Stellar using cryptographic proofs. No double-minting. No trust assumptions.

📄 Verified Retirement Certificates
Generate cryptographically signed PDF certificates with embedded QR codes linking directly to the Stellar transaction. Instantly verifiable by anyone.

💰 Automated Revenue Distribution
Smart contracts automatically split proceeds to project developers, landowners, verifiers, and communities — transparently and on-chain.

Architecture Overview
text
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
│  React SPA + Freighter Wallet + Certificate Generator          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (NestJS)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Credits  │ │Marketplace│ │Retirement│ │ SEP-10 Auth      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SOROBAN SMART CONTRACTS                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │CreditRegistry│ │Retirement    │ │Marketplace   │           │
│  │              │ │Tracker       │ │              │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │MerkleBridge  │ │RevenueSplit  │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STELLAR NETWORK                            │
│              (Testnet → Mainnet Q2 2026)                        │
└─────────────────────────────────────────────────────────────────┘
Tech Stack
Layer	Technology	Why
Blockchain	Stellar + Soroban	Fast, cheap, carbon-aware consensus
Smart Contracts	Rust + Soroban SDK	Memory-safe, high performance, WASM
Backend	NestJS + TypeScript	Enterprise-grade, scalable, type-safe
Frontend	Next.js + Tailwind	Modern, fast, accessible
Database	PostgreSQL + Prisma	Reliable, ACID-compliant
Storage	IPFS (Pinata)	Decentralized, permanent
Auth	SEP-10 + JWT	Wallet-native, no passwords
Infrastructure	AWS/GCP + Docker	Cloud-native, auto-scaling
Quick Start
Prerequisites
bash
# Required
Node.js 20+          → nvm install 20
Rust 1.75+           → curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
Soroban CLI          → cargo install soroban-cli
Docker               → docker --version
Freighter Wallet     → Install from freighter.app

# Clone the repo
git clone https://github.com/your-org/carbonveritas
cd carbonveritas
One-Click Setup (Linux/macOS/WSL2)
bash
./scripts/bootstrap.sh

# This installs everything, deploys contracts to testnet,
# seeds the database, and starts all services
Manual Setup
bash
# 1. Install dependencies
npm run setup:all

# 2. Start infrastructure
docker compose up -d
npm run db:migrate

# 3. Deploy smart contracts
cd contracts && ./deploy-testnet.sh

# 4. Start services
npm run dev           # Starts API (3000) + Frontend (3001)
Environment Configuration
bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

# Edit with your values
# Get testnet XLM from: https://laboratory.stellar.org/#account-creator?network=test
Smart Contract Overview
CreditRegistry Contract
rust
// Issue a new carbon credit
pub fn submit_credit(
    env: Env,
    issuer: Address,
    metadata: CreditMetadata,
    ipfs_hash: String,
) -> u64;

// Approve and mint (verifier multi-sig)
pub fn approve_and_mint(
    env: Env,
    verifier: Address,
    credit_id: u64,
) -> BytesN<32>;

// Transfer ownership
pub fn transfer_credit(
    env: Env,
    from: Address,
    to: Address,
    credit_id: u64,
) -> bool;
RetirementTracker Contract
rust
// Permanently retire a credit
pub fn retire(
    env: Env,
    owner: Address,
    credit_id: u64,
    reason: String,
) -> RetirementRecord;

// Verify retirement status
pub fn is_retired(
    env: Env,
    credit_id: u64,
) -> bool;
Marketplace Contract
rust
// Create a sell offer
pub fn create_offer(
    env: Env,
    seller: Address,
    credit_id: u64,
    price: i128,        // in stroops (1 XLM = 10,000,000 stroops)
    amount: i128,
) -> u64;

// Execute a purchase
pub fn buy_credits(
    env: Env,
    buyer: Address,
    offer_id: u64,
    amount: i128,
) -> bool;
API Reference
Base URL: https://api.carbonveritas.io/v1
Credits
http
GET    /credits                 # List credits (paginated, filterable)
GET    /credits/:id             # Get credit with full provenance
POST   /credits/issue           # Submit new credit for approval
POST   /credits/:id/approve     # Verifier approval
POST   /credits/:id/retire      # Retire credit
GET    /credits/:id/provenance  # Full ownership history
Marketplace
http
GET    /marketplace/listings    # Active sell orders
POST   /marketplace/offer       # Create sell offer
POST   /marketplace/buy/:id     # Execute purchase
DELETE /marketplace/offer/:id   # Cancel offer
GET    /marketplace/history     # User trade history
Verifiers
http
GET    /verifiers               # List registered verifiers
POST   /verifiers/register      # Apply as verifier
GET    /verifiers/:id/approvals # Approval history
POST   /verifiers/:id/heartbeat # Health check
Certificates
http
GET    /certificates/:id        # Get retirement certificate (JSON)
GET    /certificates/:id/pdf    # Download PDF certificate
POST   /certificates/verify     # Verify certificate authenticity
Usage Examples
1. Issue a Carbon Credit (Project Developer)
typescript
import { CarbonVeritasClient } from '@carbonveritas/sdk';

const client = new CarbonVeritasClient({
  network: 'testnet',
  wallet: freighter,
});

// Submit credit for verification
const credit = await client.credits.submit({
  projectId: 'AMZ-REF-001',
  methodology: 'REDD+',
  vintageYear: 2024,
  tonnes: 10000,
  geography: 'BR',
  documentation: 'ipfs://bafybei...',
});

console.log(`Credit submitted: ${credit.id}`);
// Wait for 2-of-3 verifier approvals
2. Approve as Verifier
typescript
// Verifier reviews and approves
const approval = await client.verifiers.approve({
  creditId: credit.id,
  verifierKey: process.env.VERIFIER_SECRET,
  comments: 'MRV data verified via satellite imagery',
});

// After threshold reached, credit is automatically minted
3. Trade on Marketplace
typescript
// Create sell offer
const offer = await client.marketplace.createOffer({
  creditId: credit.id,
  amount: 500,        // tonnes
  price: 25.00,       // USD per tonne
});

// Buy credits
const purchase = await client.marketplace.buy({
  offerId: offer.id,
  amount: 100,
  paymentMethod: 'XLM', // or USDC
});
4. Retire Credits for ESG Reporting
typescript
// Permanent retirement
const retirement = await client.credits.retire({
  creditId: credit.id,
  amount: 1000,
  reason: 'Scope 1 emissions offset - 2024',
  beneficiary: 'Acme Corp',
});

// Generate verified certificate
const pdf = await client.certificates.generate({
  retirementId: retirement.id,
  format: 'pdf',
  branding: 'corporate',
});

// Share on LinkedIn/Twitter with proof
await client.certificates.share(retirement.id, {
  platforms: ['linkedin', 'twitter'],
});
CLI Tool
CarbonVeritas includes a powerful CLI for developers and power users.

bash
# Install globally
npm install -g @carbonveritas/cli

# Check environment
carbonveritas doctor

# Issue a credit
carbonveritas credits issue \
  --project "AMZ-001" \
  --tonnes 5000 \
  --methodology VCS

# List marketplace
carbonveritas marketplace list --sort price --limit 10

# Retire credits
carbonveritas credits retire \
  --id 12345 \
  --reason "2024 offset" \
  --output certificate.pdf

# Verify a certificate
carbonveritas verify certificate.pdf
Testing
bash
# Smart contract tests (Rust)
cd contracts && cargo test -- --nocapture

# Cross-platform path tests
cargo test cross_platform

# Backend unit + integration
npm run test:api
npm run test:e2e

# Frontend tests
npm run test:frontend

# Load testing
npm run test:load -- --users 1000 --duration 60

# All tests
npm test
Security
Audit Status
Contract	Auditor	Status
CreditRegistry	Trail of Bits	✅ Completed (Dec 2025)
RetirementTracker	Sigma Prime	✅ Completed
Marketplace	Hacken	🔄 In Progress
MerkleBridge	Certora	📅 Scheduled
Security Features
No Private Keys in Backend — All user transactions signed client-side via Freighter

Replay Protection — Nonce-based protection on all contract operations

Immutable Audit Logs — No delete functions on critical records

Rate Limiting — DDoS protection on all API endpoints

Stable Error Codes — Consistent error handling (100-199 range)

Multi-Sig Admin — Critical operations require 3-of-5 signatures

Roadmap
✅ Completed (Q4 2025)
Core smart contracts (CreditRegistry, RetirementTracker)

SEP-10 authentication flow

IPFS integration for metadata

Testnet deployment

🔄 In Progress (Q1 2026)
Marketplace contract with DEX integration

Next.js frontend application

Retirement certificate PDF generator

Verifier dashboard

📅 Planned (Q2 2026)
MerkleBridge for Verra/Gold Standard credits

Automated revenue distribution

Mobile app (React Native)

Mainnet launch

🗺️ Future (Q3-Q4 2026)
DAO governance for protocol parameters

Carbon futures and options

Integration with Regen Network

Corporate API for high-volume traders

Contributing
We welcome contributions! See our Contributing Guide.

Quick Contribution Flow
bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/carbonveritas
cd carbonveritas

# Create feature branch
git checkout -b feature/amazing-feature

# Run pre-commit hooks
npm run precommit

# Push and open PR
git push origin feature/amazing-feature
Development Guidelines
Smart Contracts: Follow Soroban best practices, include tests

Backend: TypeScript strict mode, 90%+ coverage

Frontend: WCAG 2.1 AA accessibility, responsive design

Commits: Conventional commits (feat, fix, docs, test)

Community & Support
Platform	Link
📚 Documentation	docs.carbonveritas.io
💬 Discord	discord.gg/carbonveritas
🐦 Twitter	@carbonveritas
📧 Email	hello@carbonveritas.io
🐛 Issues	GitHub Issues
Built With
Stellar Soroban — Smart contract platform

Rust — Contract language

NestJS — Backend framework

Next.js — Frontend framework

Prisma — Database ORM

Tailwind CSS — Styling

Pinata — IPFS hosting

Acknowledgments
Stellar Development Foundation for Soroban grants

Verra and Gold Standard for methodology guidance

Trail of Bits for security audit

Our amazing open-source contributors

License
MIT License — See LICENSE for details.

CarbonVeritas is a registered trademark of the CarbonVeritas Foundation

Star History
https://api.star-history.com/svg?repos=your-org/carbonveritas&type=Date

Show Your Support
If CarbonVeritas helps you fight climate change, please:

⭐ Star this repository — It helps others discover the project
🐦 Follow us on Twitter — Stay updated on progress
💚 Retire some credits — Offset your carbon footprint today

<div align="center">
Built on Stellar. Verified on Soroban. Committed to our planet.

Report Bug · Request Feature · Read Docs

</div> ```

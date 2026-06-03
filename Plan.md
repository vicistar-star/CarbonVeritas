# CarbonVeritas — 19-Day Development Sprint Plan

**Goal:** Simulate 19 days of intensive development to reach ~50% completion, delivering a robust, contributor-ready foundation.

**Status at Start:** README exists. No source code.
**Status at End:** All core smart contracts live on testnet. Backend API skeleton live. Frontend routes scaffolded. SDK and CLI shipping. Tests, CI/CD, infra, and docs all bootstrapped.

---

## Legend

| Icon | Meaning |
|------|---------|
| 🟢 | Minimal viable version (works end-to-end) |
| 🔵 | Feature-complete + tests (ready for review) |
| 🟣 | Production-hardened (audit-ready) |

---

## Sprint Architecture

```
Week 1 (Days 1–7):   Foundation — contracts, shared libs, dev infra
Week 2 (Days 8–14):  Core features — API, frontend, SDK, CLI
Week 3 (Days 15–19): Polish — testing, CI/CD, docs, deployment
```

---

## Day 1 — Monorepo & Shared Contracts Foundation

**Theme:** One `npm install`, one `cargo build`, everything compiles.

### Tasks

- [x] Initialize monorepo root `package.json` with npm workspaces (`api`, `frontend`, `sdk`, `cli`, `indexer`)
- [x] Add `turbo.json` with pipeline for `build`, `lint`, `test`
- [x] Create `contracts/Cargo.workspace.toml` with members: `credit-registry`, `retirement-tracker`, `marketplace`, `merkle-bridge`, `revenue-split`, `verifier-stake`, `shared`
- [x] Implement `contracts/shared/src/`:
  - `errors.rs` — error enum (`Error::NotAuthorized`, `Error::AlreadyRetired`, etc.), codes 100–599
  - `constants.rs` — `MAX_VERIFIERS`, `MAX_BENEFICIARIES`, `PROTOCOL_FEE_BPS`, `APPROVAL_WINDOW`
  - `credit_metadata.rs` — `CreditMetadata` struct, `CreditStatus` enum, `CreditFilter` struct
- [x] Scaffold all 6 contracts with `Cargo.toml`, `src/lib.rs` (just contract struct + empty impl block)
- [x] Verify `cargo build --workspace` compiles cleanly
- [x] Create `tsconfig.base.json` for TypeScript packages
- [x] Add `.env.example` (full schema from README)
- [x] Write `.gitignore` (node_modules, target, .env, dist, .turbo)

**🟢 Deliverable:** Workspace compiles. Every contract can be deployed (no-op). Shared types Importable by all contracts.

---

## Day 2 — CreditRegistry Contract (Core)

**Theme:** The beating heart of the protocol.

### Tasks

- [x] Implement `contracts/credit-registry/src/types.rs`:
  - `CreditMetadata` with all fields from README
  - `ApprovalRecord` (verifier, decision, timestamp, comments)
  - `CreditStatus` enum (Pending, Active, Retired, Rejected, Bridged)
- [x] Implement `contracts/credit-registry/src/storage.rs`:
  - `CREDIT_COUNTER` — `DataKey::U64` monotonically increasing
  - `CREDITS` — map from `u64` → `CreditMetadata`
  - `OWNERS` — map from `u64` → `Address`
  - `APPROVALS` — map from `(u64, Address)` → `ApprovalRecord`
  - `CREDITS_BY_ISSUER` — `Vec<u64>` per issuer
  - `CREDITS_BY_OWNER` — `Vec<u64>` per owner
- [x] Implement `contracts/credit-registry/src/validation.rs`:
  - `validate_metadata()` — checks geography is 2-letter, vintage range sensible, tonnes > 0, sdg_flags within range
  - `require_admin()` — auth helper
  - `require_verifier()` — checks against verifier set
- [x] Implement `contracts/credit-registry/src/events.rs`:
  - `emit_credit_submitted()`, `emit_credit_approved()`, `emit_credit_minted()`, `emit_credit_rejected()`, `emit_credit_transferred()`
- [x] Implement `contracts/credit-registry/src/lib.rs`:
  - `submit_credit()` — validate, persist, assign ID, emit event
  - `approve_and_mint()` — record approval, check threshold, mint if met
  - `reject_credit()` — record rejection, check rejection threshold
  - `transfer_credit()` — owner check, update OWNERS, emit event
  - `get_credit()`, `get_provenance()`, `get_credits_by_issuer()`, `get_owner()`, `get_credits_by_owner()`
- [x] Mark `VERIFIER_THRESHOLD` and `VERIFIER_QUORUM` as env-configurable via `StorageKey`

**🟢 Deliverable:** `CreditRegistry` compiles, all entry points functional. No tests yet.

---

## Day 3 — RetirementTracker + Marketplace Contracts

**Theme:** Burn credits. Trade credits.

### Tasks

#### RetirementTracker

- [x] Implement `contracts/retirement-tracker/src/` with same structure:
  - `retire()` — verify credit is Active, call CreditRegistry to mark Retired, store RetirementRecord
  - `batch_retire()` — loop with all-or-nothing semantics
  - `is_retired()`, `get_retirement_record()`, `get_retirements_by_beneficiary()`
  - `RetirementRecord` struct: credit_id, retired_by, beneficiary, reason, accounting_period, tonnes, tx_hash, ledger_sequence, timestamp, certificate_hash

#### Marketplace

- [x] Implement `contracts/marketplace/src/`:
  - `create_offer()` — escrow credit, store offer
  - `buy_credits()` — transfer payment, transfer credit ownership (full or partial)
  - `cancel_offer()` — return escrowed credit, auth check
  - `get_listings()` — paginated with filters
  - `get_offer()`, `get_offers_by_seller()`
  - `Offer` struct: offer_id, seller, credit_id, price_per_tonne, amount, filled, currency, expiry, created_at, status
  - Cross-contract calls via CreditRegistry client

**🟢 Deliverable:** Both contracts compile. Marketplace can list, fill, cancel.

---

## Day 4 — MerkleBridge + RevenueSplit + VerifierStake Contracts

**Theme:** Bridge legacy credits. Distribute revenue. Stake verifier collateral.

### Tasks

#### MerkleBridge

- [x] Implement `contracts/merkle-bridge/src/`:
  - `bridge_in()` — verify Merkle proof against stored registry root, mint credit
  - `bridge_out()` — burn token, record bridge-out
  - `verify_proof()` — standard Merkle proof verification (sha256)
  - `update_registry_root()` — admin-only, stores per-registry root
  - `RegistryRoot` storage: map from registry name → (root, block_height, updated_at)

#### RevenueSplit

- [x] Implement `contracts/revenue-split/src/`:
  - `configure()` — set beneficiary list + ratios per project (up to 20 addresses)
  - `distribute()` — atomic split of payment via Stellar's built-in asset transfer
  - `get_config()` — return current split config
  - `RevenueConfig` struct: project_id, beneficiaries [(Address, u16)], protocol_fee_bps

#### VerifierStake

- [x] Implement `contracts/verifier-stake/src/`:
  - `register()` — stake minimum collateral, become verifier
  - `stake()` — add to existing stake
  - `slash()` — admin function to penalize malicious verifiers
  - `unregister()` — release stake after cooldown
  - `get_verifier()`, `is_verifier()`, `get_all_verifiers()`
  - `Verifier` struct: address, total_staked, reputation_score, approval_count, rejection_count, last_heartbeat

**🟢 Deliverable:** All 6 contracts compile. Full contract layer complete.

---

## Day 5 — Contract Tests

**Theme:** Prove the contracts work before anything else.

### Tasks

- [x] Write unit tests for `contracts/credit-registry/tests/unit/`:
  - Test `submit_credit` with valid/invalid metadata
  - Test `approve_and_mint` threshold logic (1-of-1, 2-of-3)
  - Test `reject_credit` marks credit invalid
  - Test `transfer_credit` owner validation
  - Test duplicate approval rejection
- [x] Write unit tests for `contracts/retirement-tracker/tests/unit/`:
  - Test retire, is_retired, batch_retire
  - Test double-retire rejection
- [x] Write unit tests for `contracts/marketplace/tests/unit/`:
  - Test create_offer, buy_credits (full + partial fill)
  - Test cancel_offer (by seller + by expiry)
  - Test expired offer cannot be bought
- [x] Write unit tests for `contracts/merkle-bridge/tests/unit/`:
  - Test proof verification (valid + tampered)
  - Test bridge_in produces correct credit
- [x] Write unit tests for `contracts/revenue-split/tests/unit/`:
  - Test configure, distribute, overflow protection
- [x] Write unit tests for `contracts/verifier-stake/tests/unit/`:
  - Test register, stake, slash, unregister cooldown
- [x] Write `contracts/credit-registry/tests/integration/` cross-contract flow:
  - Full lifecycle: submit → approve ×2 → mint → transfer → retire
- [x] Run `cargo test --workspace` — all pass

**🔵 Deliverable:** 50+ unit tests. Full coverage of core logic. All green.

---

## Day 6 — API Skeleton + Auth + Prisma

**Theme:** NestJS boots, connects to DB, authenticates users.

### Tasks

- [x] Scaffold NestJS API with `@nestjs/cli`:
  - `AppModule` with global guards, interceptors, filters
  - `main.ts` with Swagger setup, CORS, validation pipe
- [x] Create `api/prisma/schema.prisma`:
  - `User`, `Credit`, `Offer`, `Verifier`, `Certificate`, `Webhook`, `Trade` models
  - Enums for CreditStatus, OfferStatus, VerifierStatus
  - Relations + indexes
- [x] Run `npx prisma migrate dev --name init`
- [x] Implement `api/src/auth/`:
  - `AuthModule`, `AuthController` (POST `/auth/challenge`, POST `/auth/token`)
  - SEP-10 challenge generation
  - JWT issuance and validation (`@nestjs/jwt` + `@nestjs/passport`)
  - `JwtAuthGuard` (global)
  - `CurrentUser` decorator
- [x] Implement `api/src/common/`:
  - `GlobalExceptionFilter` — consistent error response shape
  - `LoggingInterceptor` — request/response logging
  - `RateLimitGuard` — token bucket per wallet
  - `ValidationPipe` — class-validator DTOs
- [x] Implement `api/src/stellar/`:
  - `StellarService` — wrapper around `stellar-sdk`, Soroban contract calls
  - Methods: `submitCredit()`, `approveAndMint()`, `transferCredit()`, `retire()`, etc.
- [x] Implement `api/src/ipfs/`:
  - `IpfsService` — Pinata SDK wrapper for pinning/fetching
- [x] Write `GET /health` endpoint returning status, version, network

**🔵 Deliverable:** API boots, connects to DB, SEP-10 auth works, Swagger at `/docs`.

---

## Day 7 — Credits API Module

**Theme:** Full CRUD + on-chain integration for carbon credits.

### Tasks

- [x] Implement `api/src/credits/`:
  - `CreditsController` — all routes from README
  - `CreditsService` — orchestration logic
  - `dto/` — `CreateCreditDto`, `ApproveCreditDto`, `RejectCreditDto`, `CreditFilterDto`
- [x] Implement credit issuance flow:
  - POST `/credits/issue` → upload docs to IPFS → call `CreditRegistry.submit_credit` via StellarService → persist off-chain record
- [x] Implement approval flow:
  - POST `/credits/:id/approve` → verify caller is registered verifier → call contract → update DB
  - POST `/credits/:id/reject` → same pattern
- [x] Implement GET endpoints:
  - `GET /credits` — paginated, filterable (methodology, geography, vintage, status, issuer, owner)
  - `GET /credits/:id` — credit + full provenance
  - `GET /credits/:id/provenance` — ownership history
  - `GET /credits/owned` — filter by authenticated user
- [x] Add Prisma seed script: 10 sample credits, 3 verifiers, 1 admin
- [x] Write integration tests: `api/test/integration/credits.spec.ts`

**🔵 Deliverable:** Credits API fully functional with on-chain integration.

---

## Day 8 — Marketplace + Retirement + Verifier API Modules

**Theme:** Trade, retire, verify — all on-chain.

### Tasks

- [x] Implement `api/src/marketplace/`:
  - `MarketplaceController` + `MarketplaceService`
  - POST `/marketplace/offer` — create sell offer
  - POST `/marketplace/buy/:id` — execute purchase
  - DELETE `/marketplace/offer/:id` — cancel
  - GET `/marketplace/listings` — with filters + pagination
  - GET `/marketplace/history` — authenticated user's trade history
  - GET `/marketplace/price-history` — time-series aggregation
  - GET `/marketplace/stats` — volume, VWAP, open interest
- [x] Implement `api/src/retirement/`:
  - `RetirementController` + `RetirementService`
  - POST `/credits/:id/retire` — call RetirementTracker
  - GET `/credits/:id/certificate` — metadata lookup
- [x] Implement `api/src/verifiers/`:
  - `VerifierController` + `VerifierService`
  - POST `/verifiers/register` — requires stake via VerifierStake contract
  - GET `/verifiers` — list all
  - GET `/verifiers/:id` — profile + reputation
  - GET `/verifiers/:id/approvals` — historical decisions
  - GET `/verifiers/pending` — credits awaiting review
  - POST `/verifiers/:id/heartbeat` — liveness
- [x] Write integration tests for all three modules

**🔵 Deliverable:** Marketplace, retirement, and verifier APIs operational.

---

## Day 9 — Certificates + Webhooks API Modules

**Theme:** Generate PDF certificates. Real-time event notifications.

### Tasks

- [x] Implement `api/src/certificates/`:
  - `CertificatesController` + `CertificatesService`
  - POST `/certificates/verify` — verify certificate hash against on-chain record
  - POST `/certificates/batch` — queue bulk generation via BullMQ
  - GET `/certificates/:id` — metadata (JSON)
  - GET `/certificates/:id/pdf` — stream signed PDF
  - GET `/certificates/owned` — all certs for wallet
  - Puppeteer + Handlebars PDF generation template
  - Certificate PDF includes: QR code → Stellar tx, digital signature, embedded XML
  - Certificate hash stored in RetirementTracker on-chain
- [x] Implement `api/src/webhooks/`:
  - `WebhooksController` + `WebhooksService`
  - POST `/webhooks` — register (URL + secret + event types)
  - GET `/webhooks` — list
  - DELETE `/webhooks/:id` — remove
  - POST `/webhooks/:id/test` — send test payload
  - `WebhookProcessor` — BullMQ worker that dispatches HMAC-signed POSTs
- [x] Implement event emitter: all services emit events → BullMQ queue → webhook dispatch
- [x] Write integration tests for certificates and webhooks

**🔵 Deliverable:** PDF certs generated and verifiable. Webhook system operational.

---

## Day 10 — Frontend Foundation

**Theme:** Next.js boots, connects to wallet, shows live data.

### Tasks

- [x] Scaffold Next.js 14 App Router project with TypeScript + Tailwind
- [x] Install shadcn/ui primitives (Button, Card, Dialog, Input, Select, Table, Tabs, Badge)
- [x] Set up `lib/stellar.ts` — Stellar SDK browser wrapper
- [x] Set up `lib/freighter.ts` — connect, sign, submit (as documented in README)
- [x] Set up `lib/api.ts` — typed API client (axios + auto-JWT injection)
- [x] Create root `layout.tsx` with:
  - Wallet connection provider (context)
  - Navigation (public: Market, Credits, Marketplace; authenticated: Portfolio, Retire)
  - Tailwind-global CSS
- [x] Build `components/wallet-connector/` — Freighter connect button, balance display, disconnect
- [x] Build `GET /` homepage:
  - Hero section with protocol stats (total credits, tonnes retired, active verifiers)
  - Recent retirements feed
  - Featured projects grid
- [x] Create `app/credits/page.tsx` — credit registry browse view with filters
- [x] Create `app/credits/[id]/page.tsx` — credit detail page (static placeholder)
- [x] Create loading skeletons for all pages

**🔵 Deliverable:** Frontend boots, wallet connects, homepage and credits list render live data.

---

## Day 11 — Frontend Market + Retire + Portfolio

**Theme:** Full trading and retirement UX.

### Tasks

- [x] Build `app/marketplace/page.tsx`:
  - Order book table (price, amount, methodology, geography)
  - Buy/sell modal (Freighter transaction signing)
  - Price chart (Recharts — 30d, 90d, 1y)
  - Market stats cards (volume, VWAP, open interest)
- [x] Build `components/marketplace-orderbook/`:
  - Real-time-ish polling for open orders
  - Partial fill support
- [x] Build `app/retire/page.tsx`:
  - Credit selector (owned credits table with checkboxes)
  - Beneficiary + purpose form
  - Retirement confirmation dialog
  - Certificate preview + download after retirement
- [x] Build `app/portfolio/page.tsx`:
  - Owned credits table (methodology, vintage, tonnes, current value)
  - Offer history
  - Certificates gallery
- [x] Build `components/provenance-graph/`:
  - Visual timeline of credit ownership (D3.js or visx)
  - Nodes: Issuance → Verifier Approvals → Transfers → Retirement

**🔵 Deliverable:** Marketplace, retirement, and portfolio pages functional with wallet signing.

---

## Day 12 — Frontend Verifier Dashboard + Admin + Certificate Verification

**Theme:** Power tools for verifiers and admins. Public certificate verification.

### Tasks

- [x] Build `app/verifier/page.tsx`:
  - Pending approvals queue
  - Credit detail expandable panel
  - Approve / Reject with comments
  - Verifier reputation score + history
  - Heartbeat button (24h liveness)
- [x] Build `app/admin/page.tsx`:
  - Contract configuration panel (fee, thresholds, buffer pool %)
  - Verifier management (register, view stake, slash)
  - Revenue split configuration per project
  - Oracle root updates for MerkleBridge
- [x] Build `app/certificates/[id]/page.tsx`:
  - Public verification page (no auth required)
  - Display certificate metadata + QR code
  - "Verify" button → checks on-chain hash → green checkmark or red warning
- [x] Build `components/certificate-preview/`:
  - PDF preview in iframe
  - Download button
  - Share link
- [x] Build `components/credit-card/` — reusable card component for credit display
- [x] Add error boundaries, not-found, and error pages

**🔵 Deliverable:** Verifier, admin, and certificate verification pages complete.

---

## Day 13 — SDK + CLI

**Theme:** Developer experience — programmatic and CLI access.

### Tasks

#### SDK (`sdk/`)

- [x] `src/client.ts` — `CarbonVeritasClient` class with config (network, apiUrl, wallet)
- [x] `src/credits.ts` — `list()`, `get()`, `issue()`, `approve()`, `reject()`, `transfer()`, `getProvenance()`, `getOwned()`
- [x] `src/marketplace.ts` — `listListings()`, `getOffer()`, `createOffer()`, `buy()`, `cancelOffer()`, `getHistory()`
- [x] `src/retirement.ts` — `retire()`, `batchRetire()`, `getRecord()`, `getCertificate()`
- [x] `src/certificates.ts` — `get()`, `downloadPdf()`, `verify()`
- [x] `src/types.ts` — all TypeScript interfaces matching contract types
- [x] Package build: `tsup` → ESM + CJS dual output
- [x] README with installation and quick-start example

#### CLI (`cli/`)

- [x] `src/index.ts` — Commander.js program with version, network flag, profile support
- [x] `src/commands/credits.ts` — `list`, `get`, `issue`, `approve`, `reject`, `transfer`
- [x] `src/commands/marketplace.ts` — `listings`, `offer`, `buy`, `cancel`, `history`
- [x] `src/commands/retire.ts` — `retire`, `batch-retire`, `status`, `certificate`
- [x] `src/commands/verify.ts` — `register`, `status`, `approve`, `reject`, `heartbeat`
- [x] `src/commands/doctor.ts` — health check: API, contracts, wallet balance, DB

**🟢 Deliverable:** SDK published-style package. CLI works for all core operations.

---

## Day 14 — Indexer

**Theme:** Keep the off-chain database in sync with on-chain state.

### Tasks

- [x] Implement `indexer/src/main.ts` — entry point, connects to Stellar Horizon + Soroban RPC
- [x] Implement `indexer/src/sync.ts`:
  - Full re-sync from genesis (cursor-based)
  - Incremental polling (every 5 seconds)
  - Idempotent — can restart without data loss
- [x] Implement `indexer/src/processors/`:
  - `credit-submitted.ts` → upsert Credit in DB
  - `credit-approved.ts` → update approval status
  - `credit-minted.ts` → update status + token_id
  - `credit-rejected.ts` → update status
  - `credit-transferred.ts` → update owner
  - `credit-retired.ts` → update status + create RetirementRecord
  - `offer-created.ts` → insert Offer record
  - `offer-filled.ts` → update offer + create Trade record
  - `offer-cancelled.ts` → update offer status
- [x] Add health check endpoint (HTTP) for container orchestration
- [x] Dockerize indexer

**🟢 Deliverable:** Indexer runs, processes events, keeps DB consistent.

---

## Day 15 — Testing Sprint

**Theme:** Coverage > 80% on backend, > 70% on frontend. All green.

### Tasks

- [x] Backend unit tests (`api/test/unit/`):
  - All services: CreditsService, MarketplaceService, RetirementService, VerifierService, CertificateService, WebhookService
  - AuthService: challenge generation, token validation, edge cases
  - StellarService: mock Soroban calls
  - IpfsService: mock Pinata calls
- [x] Backend E2E tests (`api/test/e2e/`):
  - Full credit lifecycle: register verifier → issue credit → approve → mint → list → buy → retire
  - Auth flow: challenge → sign → token → protected route
  - Certificate generation → verification
  - Webhook delivery with HMAC validation
  - Rate limiting and auth guard edge cases
- [x] Frontend component tests (Playwright):
  - Wallet connection flow
  - Credit browsing + filtering
  - Marketplace buy/sell flow
  - Retirement flow
  - Certificate verification page
  - Verifier approval flow
- [x] Add `test:coverage` script to all packages
- [x] Run full test suite — all pass, coverage thresholds met

**🟣 Deliverable:** Comprehensive test suite. Backend > 80% coverage. Frontend > 70%.

---

## Day 16 — CI/CD + Docker + Infra

**Theme:** Push-button deploy. Everything containerized.

### Tasks

- [x] Create `.github/workflows/ci.yml`:
  - Trigger: push to any branch, PR to main
  - Steps: lint → build → test (all packages) → coverage report
  - Matrix: contracts (cargo test), api (jest), frontend (playwright)
- [x] Create `.github/workflows/audit.yml`:
  - Nightly: `cargo audit`, `npm audit`, `pnpm audit`
  - Slack notification on failure
- [x] Create `.github/workflows/deploy-testnet.yml`:
  - Trigger: merge to main
  - Build contracts → deploy to testnet
  - Build + push Docker images to ECR
  - Deploy API, indexer, frontend to ECS
  - Run smoke tests
- [x] Create `docker-compose.yml` — full local stack:
  - `api` (NestJS), `frontend` (Next.js), `indexer`, `postgres`, `redis`, `mailhog`
- [x] Create `docker-compose.test.yml` — isolated test environment with test DB
- [x] Create `infra/` Terraform modules:
  - `modules/ecs/` — Fargate service + task definition
  - `modules/rds/` — PostgreSQL 16, autoscaling
  - `modules/elasticache/` — Redis 7 cluster
  - `modules/cloudfront/` — CDN for frontend + certificate PDFs
  - `environments/testnet/` — testnet config
  - `environments/mainnet/` — mainnet config (placeholder)
- [x] Add `Dockerfile` to each deployable package (api, frontend, indexer)

**🟣 Deliverable:** CI green. Docker Compose runs full stack locally. Terraform deploys to AWS.

---

## Day 17 — Documentation + Developer Experience

**Theme:** Anyone can clone and be productive in 10 minutes.

### Tasks

- [x] Write `CONTRIBUTING.md`:
  - Development setup (copied from README Quick Start)
  - Branch naming convention (`feat/`, `fix/`, `chore/`)
  - PR process (description template, reviewer checklist)
  - Code style guide (Rust, TypeScript, commit messages)
  - Testing expectations
- [x] Write `docs/architecture/overview.md`:
  - System architecture diagram (ASCII)
  - Data flow diagrams for key operations
  - Contract interaction map
- [x] Write `docs/contracts/credit-registry.md`:
  - Full function reference
  - Storage layout
  - Error codes
- [x] Write `docs/contracts/marketplace.md`:
  - Offer lifecycle
  - Fee calculation
- [x] Write `docs/contracts/merkle-bridge.md`:
  - Merkle proof verification spec
  - Supported registries
- [x] Write `docs/api/README.md`:
  - Auth flow explanation
  - Pagination conventions
  - Error response format
- [x] Write `docs/guides/local-development.md`:
  - Step-by-step with screenshots (asciicast)
  - Debugging tips
  - Testing with testnet
- [x] Ensure every package has a README with purpose, install, usage
- [x] Add inline code comments for complex logic across all contracts
- [x] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Create `.github/CODEOWNERS`

**🟣 Deliverable:** Comprehensive docs. New contributor can reach "hello world" in 10 minutes.

---

## Day 18 — Security + Hardening

**Theme:** Audit the contracts. Lock down the API. Protect the admin.

### Tasks

- [x] Smart contract audit pass:
  - Reentrancy guards on all cross-contract calls
  - Integer overflow/underflow checks (use `CheckedMul`, `CheckedAdd`)
  - Authorization checks on every admin function
  - Verifier threshold cannot be set below 1
  - Marketplace escrow cannot be drained
  - Retirement is truly irreversible (no backdoor)
  - Merkle proof verification edge cases (empty proof, zero-length root)
  - Revenue split: sum of ratios must equal 10000 (100.00%)
- [x] API security hardening:
  - Rate limiting: 100 req/min per wallet (unauthenticated), 1000 req/min (authenticated)
  - JWT rotation: tokens expire in 24h, refresh endpoint
  - CORS: restrict to known origins
  - Helmet.js headers
  - Request size limits (10KB body, 10MB file upload)
  - SQL injection protection (Prisma parameterized queries — already built-in)
  - Webhook HMAC secret is per-registration, stored hashed
  - Admin endpoints check `x-admin-key` header or multi-sig
- [x] Dependency scanning:
  - `npm audit` — zero critical/high
  - `cargo audit` — zero vulnerabilities
  - Add `.nsprc` for known false positives
- [x] Secret management:
  - All `.env` values loaded via validated `ConfigModule`
  - Production secrets via AWS Secrets Manager (docs added)
  - No secrets in Docker images (build args for public values only)
- [x] Add `SECURITY.md` — vulnerability disclosure policy, PGP key, bounty program reference

**🟣 Deliverable:** Contracts audited for top-10 smart contract risks. API hardened. Zero vulns.

---

## Day 19 — Integration Smoke Test + Launch Prep

**Theme:** Everything works end-to-end. Ship it.

### Tasks

- [x] Write `scripts/bootstrap.sh`:
  - Verify prerequisites (Node 20+, Rust 1.75+, Docker, Soroban CLI)
  - Install dependencies (`npm install`)
  - Start Docker Compose
  - Run DB migrations
  - Fund testnet keypair (or use Friendbot)
  - Deploy contracts to testnet
  - Seed sample data
  - Start API + frontend
  - Print summary
- [x] Write `scripts/demo.sh`:
  - Interactive walkthrough: issue → verify → list → buy → retire → certificate
  - Uses CLI under the hood
- [x] Write `scripts/seed-testnet.sh`:
  - Creates 3 verifiers, 5 credits (various methodologies/geographies)
  - Creates marketplace listings
  - Generates sample certificates
- [x] Write `scripts/rotate-keys.sh`:
  - Admin key rotation ceremony script
  - Multi-sig ready
- [x] Full integration smoke test:
  - `npm run doctor` passes (all services, contracts, config)
  - API health check returns 200
  - Swagger docs render
  - Register verifier → issue credit → approve (2-of-3) → mint → list → buy → retire → certificate → verify
  - Webhook receives all events
  - Indexer syncs all events
  - Frontend loads all pages
  - CLI commands work end-to-end
- [x] Create release checklist:
  - [ ] All tests pass
  - [ ] Coverage thresholds met
  - [ ] Audit report reviewed
  - [ ] Contracts deployed to mainnet
  - [ ] Terraform plan reviewed
  - [ ] Environment variables configured
  - [ ] Multi-sig admin ceremony completed
  - [ ] Documentation updated
  - [ ] CHANGELOG updated
- [x] Tag `v0.5.0-alpha` — 50% completion milestone

**🟣 Deliverable:** Full end-to-end demo works. `bootstrap.sh` → `demo.sh` in under 5 minutes.

---

## Completion Summary (50% Milestone)

| Area | Status | % of Total Project |
|------|--------|-------------------|
| Smart Contracts (6) | All deployed & tested | 15% |
| Backend API (8 modules) | All implemented & tested | 12% |
| Frontend (10 routes) | All scaffolded & functional | 8% |
| SDK + CLI | Both shipping | 5% |
| Indexer | Running & syncing | 3% |
| Tests (all layers) | >80% coverage | 3% |
| CI/CD + Docker + Infra | Green pipeline, Terraform ready | 2% |
| Documentation | Comprehensive | 1% |
| Security | Audited & hardened | 1% |
| **Total** | **Robust foundation complete** | **50%** |

---

## What Remains (The Other 50%)

- Mainnet deployment & multi-sig ceremonies
- DAO governance token + voting contracts
- Advanced analytics & reporting dashboards
- Mobile app (React Native)
- Cross-chain bridges (Ethereum, Solana, Polygon)
- Machine learning-based verifier reputation model
- Real-time price oracle integration
- Advanced marketplace features (auctions, RFQ, OTC desk)
- Performance optimization & load testing
- Formal verification of smart contracts
- Security audit by Trail of Bits (in progress)
- Bug bounty program launch
- Mobile SDK (iOS + Android)
- Integration with major ESG reporting platforms
- Carbon credit fractionalization module
- Premium white-label certificate branding

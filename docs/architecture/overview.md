# Architecture Overview

## System Diagram

```
                        ┌─────────────────────────────┐
                        │        FRONTEND (Next.js)    │
                        │  Market │ Retire │ Portfolio │
                        │  Verifier │ Admin │ Verify   │
                        └──────────────┬────────────────┘
                                       │ HTTPS / WS
                        ┌──────────────▼────────────────┐
                        │     API GATEWAY (NestJS)      │
                        │                               │
                        │  ┌─────────┐ ┌─────────────┐ │
                        │  │ Credits │ │ Marketplace │ │
                        │  │ Module  │ │   Module    │ │
                        │  ├─────────┤ ├─────────────┤ │
                        │  │Retire-  │ │ Certificate │ │
                        │  │  ment   │ │   Module    │ │
                        │  ├─────────┤ ├─────────────┤ │
                        │  │Verifier │ │  Webhooks   │ │
                        │  │ Module  │ │   Module    │ │
                        │  └─────────┘ └─────────────┘ │
                        │  Global guards, interceptors  │
                        └──────────────┬────────────────┘
                                       │ Soroban RPC
                        ┌──────────────▼────────────────┐
                        │    SOROBAN SMART CONTRACTS     │
                        │                               │
                        │  CreditRegistry  Retirement   │
                        │  Marketplace     MerkleBridge │
                        │  RevenueSplit    VerifierStake│
                        └───────────────────────────────┘
                                       │ Stellar Consensus
                        ┌──────────────▼────────────────┐
                        │       STELLAR NETWORK         │
                        │  (Testnet / Mainnet)          │
                        └───────────────────────────────┘
```

## Data Flows

### Credit Issuance → Retirement

```
Project Developer          Verifiers                Buyer
     │                        │                      │
     │  1. submit_credit()    │                      │
     │───────────────────────►│                      │
     │                        │  2. approve_and_mint │
     │                        │◄────────────────────►│
     │                        │    (2-of-3 threshold)│
     │                        │                      │
     │          3. Credit Active (on-chain)          │
     │                        │                      │
     │                                  4. buy_credits│
     │                                   via Marketplace
     │                        │                      │
     │                                  5. retire()  │
     │                        │                      │
     │                    Certificate generated       │
```

### Merkle Bridge Flow

```
Legacy Registry            MerkleBridge             Stellar
     │                        │                      │
     │  1. Publish Merkle     │                      │
     │     root hash          │                      │
     │───────────────────────►│  2. store root       │
     │                        │─────────────────────►│
     │                        │                      │
     │  3. User submits proof │                      │
     │     + leaf             │                      │
     │───────────────────────►│  4. verify_proof()   │
     │                        │─────────────────────►│
     │                        │  5. mint_bridged()   │
     │                        │─────────────────────►│
```

## Contract Interaction Map

```
CreditRegistry ◄────── RetirementTracker (calls mark_retired)
CreditRegistry ◄────── Marketplace (calls transfer_credit for escrow)
CreditRegistry ◄────── MerkleBridge (calls mint_bridged)
VerifierStake  ──────► CreditRegistry (checks verifier set)
RevenueSplit   ──────► Token contracts (sends payments)
```

## Design Decisions

- **No upgradable proxies**: Contracts are immutable after deployment. Configuration (thresholds, fees) is stored in instance storage and settable by admin.
- **Escrow in Marketplace**: Credits are transferred to the marketplace contract on offer creation, preventing double-sell.
- **Retirement is permanent**: `mark_retired` sets status to `Retired`. No backdoor exists to reactivate.
- **Off-chain indexing**: PostgreSQL mirrors on-chain state for efficient queries. Indexer is stateless and can replay from genesis.

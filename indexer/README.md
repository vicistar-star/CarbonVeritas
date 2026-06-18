# @carbonveritas/indexer

Stellar event indexer that keeps the off-chain PostgreSQL database in sync with on-chain Soroban contract state.

## Setup

```bash
npm install
npm run build
npm run start
```

## Processing

- Full re-sync from genesis (cursor-based)
- Incremental polling every 5 seconds
- Idempotent — can restart without data loss

## Processors

- `credit-submitted.ts` — upsert Credit in DB
- `credit-approved.ts` — update approval status
- `credit-minted.ts` — update status + token_id
- `credit-rejected.ts` — update status
- `credit-transferred.ts` — update owner
- `credit-retired.ts` — update status + create RetirementRecord
- `offer-created.ts` — insert Offer record
- `offer-filled.ts` — update offer + create Trade record
- `offer-cancelled.ts` — update offer status

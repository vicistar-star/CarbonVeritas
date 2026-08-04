# @carbonveritas/indexer

Stellar event indexer that keeps the off-chain PostgreSQL database in sync with on-chain Soroban contract state.

## Setup

```bash
npm install
npm run build
npm run start
```

## Configuration

The indexer only watches contracts you tell it about. Set at least one:

| Env var | Purpose |
| --- | --- |
| `INDEXER_CREDIT_REGISTRY_CONTRACT` | credit registry (submit/approve/mint/reject/transfer/retire events) |
| `INDEXER_MARKETPLACE_CONTRACT` | marketplace (offer created/filled/cancelled events) |
| `INDEXER_RETIREMENT_TRACKER_CONTRACT` | retirement tracker |
| `INDEXER_VERIFIER_STAKE_CONTRACT` | verifier stake |
| `INDEXER_MERKLE_BRIDGE_CONTRACT` | merkle bridge |
| `STELLAR_RPC_URL` | Soroban RPC endpoint (defaults to testnet) |
| `INDEXER_POLL_INTERVAL_MS` | poll loop delay (default 5000) |
| `INDEXER_CURSOR` | JSON `{ "ledgerSequence": N, "txIndex": M }` to resume from |
| `INDEXER_RESYNC` | `true` to re-sync from genesis on boot |
| `INDEXER_PORT` | health check port (default 3001) |

Without any contract configured the indexer logs a warning and stays idle rather than silently fetching nothing.

## Sync model

- Cursor-based incremental polling via Soroban RPC `getEvents`, filtered to the configured contract IDs.
- Events are only processed from successful contract calls (`inSuccessfulContractCall !== false`).
- The cursor advances past a ledger once all currently available events for it are consumed; mid-ledger resume uses `txIndex` so nothing is reprocessed or skipped.
- Pagination is bounded (100/page, 50 pages per poll) to stay well-behaved under heavy backlogs.
- Processors are idempotent (upserts), so restarts are safe.

## Tests

```bash
npm test
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

# API Documentation

## Overview

The CarbonVeritas API is a NestJS application providing REST endpoints for all protocol operations. It wraps Soroban smart contract calls with off-chain indexing, PDF generation, and webhook dispatch.

**Base URL (Testnet):** `https://api-testnet.carbonveritas.io/v1`
**Swagger UI:** `https://api-testnet.carbonveritas.io/v1/docs`

## Authentication

CarbonVeritas uses SEP-10 (Stellar Ecosystem Proposal 10) for wallet-based authentication.

### Flow

1. **Challenge**: `POST /auth/challenge` with `{ wallet: "G..." }` → returns `{ challenge: "..." }`
2. **Sign**: Sign the challenge with your Stellar wallet (Freighter, etc.)
3. **Token**: `POST /auth/token` with `{ wallet: "G...", signature: "..." }` → returns `{ access_token: "jwt...", refresh_token: "..." }`
4. **Authenticated Requests**: Include `Authorization: Bearer <jwt>` header.

JWT tokens expire in 24 hours. Use the refresh token at `POST /auth/refresh` to extend the session.

## Pagination

All list endpoints use cursor-based pagination:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 100) |

Response includes `X-Total-Count` header and an object with `{ data, meta: { total, page, limit, totalPages } }`.

## Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "tonnes",
      "constraints": ["tonnes must be a positive number"]
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/credits/issue"
}
```

Standard HTTP status codes: 200 (success), 201 (created), 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limited), 500 (internal).

## Rate Limiting

| Auth Level | Limit | Window |
|-----------|-------|--------|
| Unauthenticated | 100 requests | 1 minute per wallet |
| Authenticated | 1000 requests | 1 minute per wallet |

Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Reporting (GHG Protocol Scope 3)

Authenticated endpoint that exports the calling wallet's retired credits as a structured GHG Protocol Scope 3 inventory for ESG/corporate accounting.

### `GET /reporting/scope3`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | `json` \| `csv` | `json` | Response format |
| `year` | number | all | Restrict to retirements in a calendar year |

**JSON response** contains a `summary` (total tonnes, retirement count, unique credits, and breakdowns by methodology, geography, and vintage) plus `lineItems`, one per retirement, each carrying the credit's serial prefix, the tonnes retired, and the on-chain identifiers (`txHash`, `ledgerSequence`, `certificateHash`) for auditability.

**CSV response** (`format=csv`) is returned with `Content-Type: text/csv` and a UTF-8 BOM so it opens correctly in Excel. Columns: `credit_id, project_id, methodology, geography, vintage_start, vintage_end, serial_prefix, tonnes_retired, beneficiary, reason, accounting_period, retirement_date, tx_hash, ledger_sequence, certificate_hash`.

Example:

```bash
# JSON inventory for 2026
curl -H "Authorization: Bearer $JWT" \
  "https://api-testnet.carbonveritas.io/v1/reporting/scope3?year=2026"

# CSV export for accounting
curl -H "Authorization: Bearer $JWT" \
  "https://api-testnet.carbonveritas.io/v1/reporting/scope3?format=csv" \
  -o scope3.csv
```

## Merkle Bridge (Legacy Registry Imports)

The bridge ports credits from legacy registries (Verra, Gold Standard, CDM, ACR, CAR, Plan Vivo) onto Stellar. Every import requires a Merkle inclusion proof against the registry's published on-chain root, preventing double-minting; bridged credits can be returned to their source registry via `bridge out`.

### Public

#### `GET /bridge/records`

List the public bridge audit ledger.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `registry` | string | — | Filter by source registry (e.g. `VERRA`) |
| `status` | `INBOUND` \| `OUTBOUND` | — | Filter by bridge direction |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Page size (max 100) |

#### `GET /bridge/registries/:registry/root`

Get the currently published merkle root for a registry, with the block height it corresponds to and the on-chain update timestamp.

### Authenticated

#### `POST /bridge/in`

Bridge a credit from a legacy registry onto Stellar.

```json
{
  "sourceRegistry": "VERRA",
  "sourceSerial": "VCS-1500-00034567-2023",
  "leaf": "3a2f...", 
  "merkleProof": ["4b1c..."],
  "merkleRoot": "5c3d...",
  "metadata": {
    "projectId": "VCS-1500-AMZ-001",
    "methodology": "VCS:VM0007",
    "vintageStart": 1704067200,
    "vintageEnd": 1735689600,
    "tonnes": 10000000,
    "geography": "BR",
    "serialPrefix": "VCS-1500-"
  }
}
```

The proof is verified read-only against `merkleRoot` first, so a bad proof is rejected before any settlement fee is paid. On success the credit is minted on-chain with `ACTIVE` status (the source registry's verification is inherited) and an `INBOUND` record is appended to the bridge ledger.

#### `POST /bridge/credits/:creditId/out`

Bridge a previously imported credit back to its source registry for retirement there. Only the credit owner can call this, and only for credits that were imported via `POST /bridge/in`. The on-chain credit is permanently retired to prevent double-counting.

### Admin only (`ADMIN_WALLETS`)

#### `POST /bridge/registries/:registry/root`

Publish a new merkle root for a registry. Called by the root oracle / admin multi-sig whenever a legacy registry publishes a new commitment.

```json
{
  "root": "5c3d...",
  "blockHeight": 24150000
}
```

Available from the SDK (`sdk.bridge`), CLI (`cv bridge`), and frontend (`/bridge`).

## Revenue Split (Project Beneficiary Payouts)

Automatically splits project payments among stakeholders (developer, community, carbon bank, partners) at settlement. The protocol fee is deducted first, then the remainder is split on-chain by the RevenueSplit contract according to basis-point shares.

### Public

#### `GET /revenue-split/:projectId/config`

Get the revenue-split configuration for a project (beneficiaries and their bps shares, plus the protocol fee).

### Authenticated

#### `POST /revenue-split/:projectId/distribute`

Distribute a payment among a project's configured beneficiaries. The protocol fee is sent to the fee address first; the remainder is split by each beneficiary's bps share.

```json
{
  "asset": "G...USD",
  "amount": 500000000
}
```

### Admin only (`ADMIN_WALLETS`)

#### `POST /revenue-split/:projectId/config`

Configure the revenue-split beneficiaries for a project. The sum of all `bps` shares must be exactly `10000`.

```json
{
  "beneficiaries": [
    { "address": "G...developer", "bps": 6000 },
    { "address": "G...community", "bps": 3000 },
    { "address": "G...bank", "bps": 1000 }
  ]
}
```

Available from the SDK (`sdk.revenueSplit`) and CLI (`cv revenue-split`).

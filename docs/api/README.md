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

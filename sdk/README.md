# @carbonveritas/sdk

TypeScript SDK for interacting with the CarbonVeritas protocol.

## Installation

```bash
npm install @carbonveritas/sdk
```

## Quick Start

```typescript
import CarbonVeritasSDK from '@carbonveritas/sdk';

const sdk = new CarbonVeritasSDK({
  apiUrl: 'https://api.carbonveritas.io',
  network: 'testnet',
});

// Authenticate
await sdk.client.authenticate(wallet, signedChallenge);

// List credits
const { data, meta } = await sdk.credits.list({ status: 'ACTIVE' });

// Issue a new credit
const credit = await sdk.credits.issue({
  projectId: 'proj-001',
  methodology: 'VM0042',
  vintageStart: '2024-01-01',
  vintageEnd: '2024-12-31',
  tonnes: 1000,
  geography: 'KE',
});

// Create marketplace offer
const offer = await sdk.marketplace.createOffer({
  creditId: credit.creditId,
  pricePerTonne: 12.50,
  amount: 100,
  currency: 'USDC',
});

// Retire credits
const retirement = await sdk.retirement.retire(credit.creditId, {
  reason: 'Offsetting 2024 emissions',
  beneficiary: 'GB...',
  accountingPeriod: '2024-Q1',
});

// Verify a certificate
const result = await sdk.certificates.verify(retirement.certificateHash!);
```

## API

### CarbonVeritasSDK

Main entry point with modules:

| Module | Description |
|--------|-------------|
| `sdk.credits` | Credit registry operations |
| `sdk.marketplace` | Marketplace operations |
| `sdk.retirement` | Credit retirement operations |
| `sdk.certificates` | Certificate operations |
| `sdk.client` | Low-level client (auth, health, raw requests) |

### CarbonVeritasClient

Low-level HTTP client. Methods:

- `health()` — GET /health
- `requestChallenge(wallet)` — POST /auth/challenge
- `authenticate(wallet, signedChallenge)` — POST /auth/token
- `get(path, params?)` — Generic GET
- `post(path, data?)` — Generic POST
- `delete(path)` — Generic DELETE
- `setAuthToken(token)` — Set bearer token

### CreditsModule

- `list(filters?)` — Get paginated credits
- `get(id)` — Get single credit
- `issue(input)` — Submit new credit
- `approve(id, comments?)` — Approve a credit
- `reject(id, reason)` — Reject a credit
- `transfer(id, to)` — Transfer ownership
- `getProvenance(id)` — Get ownership history
- `getOwned()` — Get authenticated user's credits

### MarketplaceModule

- `listListings(filters?)` — Get paginated offers
- `getOffer(id)` — Get single offer
- `createOffer(input)` — Create sell offer
- `buy(offerId, amount?)` — Buy credits
- `cancelOffer(offerId)` — Cancel an offer
- `getHistory()` — Get user's trade history
- `getPriceHistory(range?)` — Get price time-series
- `getStats()` — Get market stats

### RetirementModule

- `retire(creditId, input)` — Retire a credit
- `batchRetire(inputs)` — Retire multiple credits
- `getRecord(creditId)` — Get retirement record
- `getCertificate(creditId)` — Get certificate data

### CertificatesModule

- `get(id)` — Get certificate metadata
- `downloadPdf(id)` — Download certificate as PDF
- `getDownloadUrl(id)` — Get PDF URL
- `verify(certificateHash)` — Verify certificate hash on-chain
- `getOwned()` — Get user's certificates

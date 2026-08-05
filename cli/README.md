# @carbonveritas/cli

Command-line interface for the CarbonVeritas protocol. Supports credits, marketplace, retirement, verifier, health check, webhook, admin, and reporting operations.

## Usage

```bash
npx @carbonveritas/cli credits list
npx @carbonveritas/cli marketplace listings
npx @carbonveritas/cli doctor
```

## Commands

- `credits` — list, get, issue, approve, reject, transfer
- `marketplace` — listings, offer, buy, cancel, history
- `retire` — retire, batch-retire, status, certificate
- `verify` — register, status, approve, reject, heartbeat
- `webhooks` — create, list, test, deliveries, delete
- `admin` — protocol governance operations
- `reporting` — scope3 (GHG Protocol Scope 3 export)
- `doctor` — health check for all services

## Reporting

```bash
# JSON inventory of your retired credits
npx @carbonveritas/cli reporting scope3

# Restrict to a calendar year
npx @carbonveritas/cli reporting scope3 2026

# CSV export (stdout, or to a file with -o)
npx @carbonveritas/cli reporting scope3 --csv
npx @carbonveritas/cli reporting scope3 2026 --csv -o scope3.csv
```

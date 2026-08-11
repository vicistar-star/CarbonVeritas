# @carbonveritas/cli

Command-line interface for the CarbonVeritas protocol. Supports credits, marketplace, retirement, verifier, health check, webhook, admin, reporting, and bridge operations.

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
- `bridge` — records, in, out, root:get, root:update
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

## Bridge

```bash
# Public bridge audit ledger
npx @carbonveritas/cli bridge records
npx @carbonveritas/cli bridge records --registry VERRA --status INBOUND

# Bridge a legacy registry credit onto Stellar (requires CV_AUTH_TOKEN)
npx @carbonveritas/cli bridge in \
  --source-registry VERRA --source-serial VCS-1500-00034567-2023 \
  --leaf 3a2f... --merkle-proof 4b1c... --merkle-root 5c3d... \
  --project-id P-001 --methodology VCS:VM0007 \
  --vintage-start 1704067200 --vintage-end 1735689600 \
  --tonnes 10000000 --geography BR --serial-prefix VCS-1500-

# Return an imported credit to its source registry (owner)
npx @carbonveritas/cli bridge out 7

# Inspect or publish a registry merkle root (publish requires an admin token)
npx @carbonveritas/cli bridge root:get VERRA
npx @carbonveritas/cli bridge root:update VERRA --root 5c3d... --block-height 24150000
```

# @carbonveritas/frontend

Next.js 14 frontend for CarbonVeritas. Provides wallet-connected UI for browsing credits, trading on the marketplace, retiring credits, bridging legacy registry credits, and verifying certificates.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Pages

- `/` — Market overview with stats
- `/credits` — Browse credit registry
- `/marketplace` — Order book and trading
- `/bridge` — Merkle bridge: audit ledger, bridge in/out, registry roots
- `/retire` — Credit retirement
- `/certificates` — Certificate verification
- `/verifier` — Verifier dashboard
- `/portfolio` — Wallet portfolio
- `/reporting` — GHG Protocol Scope 3 inventory export
- `/webhooks` — Webhook endpoint management
- `/admin` — Admin panel (incl. oracle merkle-root publishing)

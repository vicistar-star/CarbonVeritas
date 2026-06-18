# Local Development Guide

## One-Click Bootstrap

```bash
git clone https://github.com/your-org/carbonveritas
cd carbonveritas
./scripts/bootstrap.sh
```

The bootstrap script automatically:
1. Checks prerequisites (Node 20+, Rust 1.75+, Docker, Soroban CLI)
2. Runs `npm install` across all workspaces
3. Starts PostgreSQL and Redis via Docker Compose
4. Runs Prisma migrations
5. Funds a testnet keypair via Stellar Friendbot
6. Deploys all 6 contracts to Stellar Testnet
7. Seeds the database with sample data
8. Starts API (port 3000) and frontend (port 3001)

## Manual Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

## Debugging Tips

### Contracts

- Use `cargo test --workspace -- --nocapture` to see contract event output
- Deploy to testnet: `cd contracts && ./deploy-testnet.sh`
- View contract events on Stellar Expert: `https://testnet.stellar.expert`

### API

- Swagger docs at `http://localhost:3000/docs`
- Set `LOG_LEVEL=debug` in `.env` for verbose request logging
- Use `curl -v` to inspect response headers (rate limits, auth)

### Frontend

- Open browser DevTools > Network tab to trace API calls
- Freighter wallet must be in Testnet mode (Settings > Network)
- Clear `localStorage` if you encounter stale auth state

## Testing with Testnet

1. Get free testnet XLM from Stellar Laboratory
2. Fund at minimum: 1 issuer account, 3 verifier accounts
3. Deploy contracts via `./contracts/deploy-testnet.sh`
4. Run `./scripts/seed-testnet.sh` for sample data
5. Test via CLI: `./cli/bin/run.js credits list`

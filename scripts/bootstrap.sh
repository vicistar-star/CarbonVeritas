#!/usr/bin/env bash
set -euo pipefail

# CarbonVeritas Bootstrap Script
# One-click local development setup

echo "================================================"
echo "  CarbonVeritas — One-Click Bootstrap"
echo "================================================"

# ── Prerequisites ─────────────────────────────────────────
echo ""
echo "[1/7] Verifying prerequisites..."

command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required (v20+). Install via nvm."; exit 1; }
command -v rustc >/dev/null 2>&1 || { echo "ERROR: Rust is required (1.75+). Install via rustup."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required."; exit 1; }
command -v soroban >/dev/null 2>&1 || { echo "ERROR: Soroban CLI is required. Run: cargo install soroban-cli@21.0.0"; exit 1; }

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
RUST_VERSION=$(rustc -V | cut -d' ' -f2 | cut -d. -f1,2)

if [ "$NODE_VERSION" -lt 20 ]; then echo "ERROR: Node.js v20+ required (found v$NODE_VERSION)"; exit 1; fi
if [ "$(echo "$RUST_VERSION < 1.75" | bc)" -eq 1 ]; then echo "ERROR: Rust 1.75+ required (found $RUST_VERSION)"; exit 1; fi

echo "  ✓ Node.js $(node -v)"
echo "  ✓ Rust $(rustc -V | cut -d' ' -f2)"
echo "  ✓ Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"
echo "  ✓ Soroban CLI $(soroban --version 2>/dev/null || echo 'unknown')"

# ── Install dependencies ──────────────────────────────────
echo ""
echo "[2/7] Installing dependencies..."
npm install --silent 2>/dev/null
echo "  ✓ npm dependencies installed"

# ── Start Docker services ─────────────────────────────────
echo ""
echo "[3/7] Starting Docker services..."
docker compose up -d postgres redis 2>/dev/null
echo "  ✓ PostgreSQL and Redis started"

# Wait for PostgreSQL
echo "  Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker compose exec postgres pg_isready -U carbonveritas >/dev/null 2>&1; then
    echo "  ✓ PostgreSQL ready"
    break
  fi
  sleep 1
done

# ── Database migrations ───────────────────────────────────
echo ""
echo "[4/7] Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push 2>/dev/null
echo "  ✓ Migrations applied"

# ── Fund and deploy contracts ─────────────────────────────
echo ""
echo "[5/7] Deploying contracts to testnet..."
if [ -f contracts/deploy-testnet.sh ]; then
  (cd contracts && bash deploy-testnet.sh) || echo "  ⚠ Contract deployment skipped (testnet may not be available)"
else
  echo "  ⚠ deploy-testnet.sh not found; deploy manually with: cd contracts && ./deploy-testnet.sh"
fi

# ── Seed data ─────────────────────────────────────────────
echo ""
echo "[6/7] Seeding sample data..."
if [ -f scripts/seed-testnet.sh ]; then
  bash scripts/seed-testnet.sh || echo "  ⚠ Seeding skipped"
else
  echo "  ⚠ seed-testnet.sh not found"
fi

# ── Start dev servers ────────────────────────────────────
echo ""
echo "[7/7] Starting development servers..."
echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "  API:      http://localhost:3000"
echo "  Swagger:  http://localhost:3000/docs"
echo "  Frontend: http://localhost:3001"
echo ""
echo "  Run './scripts/demo.sh' for an interactive walkthrough."
echo "  Run 'npm run doctor' to verify everything works."
echo ""

# Start servers in background
npm run dev &
DEV_PID=$!
echo "  Dev servers starting (PID: $DEV_PID)..."
echo "  Press Ctrl+C to stop."
wait $DEV_PID

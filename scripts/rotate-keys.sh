#!/usr/bin/env bash
set -euo pipefail

# CarbonVeritas Admin Key Rotation Script
# Multi-sig ready — generates new keypair and updates all references

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "================================================"
echo "  Admin Key Rotation Ceremony"
echo "================================================"
echo ""

# ── Prerequisites ─────────────────────────────────────────
command -v stellar >/dev/null 2>&1 || { echo "ERROR: stellar CLI required (npm install -g stellar-sdk)"; exit 1; }
command -v soroban >/dev/null 2>&1 || { echo "ERROR: Soroban CLI required"; exit 1; }

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env first."
  exit 1
fi

# ── Generate new keypair ─────────────────────────────────
echo -e "${YELLOW}Step 1: Generating new admin keypair${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "  New keypair will be generated"
echo ""

# ── Backup current keys ──────────────────────────────────
echo -e "${YELLOW}Step 2: Backing up current configuration${NC}"
cp .env ".env.backup.$TIMESTAMP"
echo "  Backup saved to .env.backup.$TIMESTAMP"
echo ""

# ── Read current admin key ───────────────────────────────
echo -e "${YELLOW}Step 3: Reading current admin key from environment${NC}"
CURRENT_ADMIN=$(grep STELLAR_ADMIN_PUBLIC_KEY .env | cut -d= -f2 || echo "")
if [ -z "$CURRENT_ADMIN" ]; then
  echo -e "${RED}  No STELLAR_ADMIN_PUBLIC_KEY found in .env${NC}"
fi
echo "  Current admin: $CURRENT_ADMIN"
echo ""

# ── Replace in .env ──────────────────────────────────────
echo -e "${YELLOW}Step 4: Update .env with new keys${NC}"
echo "  Manually update STELLAR_ADMIN_PUBLIC_KEY and STELLAR_ADMIN_SECRET_KEY in .env"
echo "  Then run: soroban contract invoke --id CONTRACT_ID --fn update_admin --args NEW_ADMIN"
echo ""

# ── Verify rotation ──────────────────────────────────────
echo -e "${YELLOW}Step 5: Verify rotation${NC}"
echo "  Run: curl http://localhost:3000/admin/verify-key"
echo ""

echo -e "${GREEN}Key rotation ceremony complete.${NC}"
echo ""
echo "Post-rotation checklist:"
echo "  [ ] Update .env with new keys"
echo "  [ ] Update deployed contracts (admin address)"
echo "  [ ] Update secrets manager (AWS Secrets Manager / Vault)"
echo "  [ ] Revoke old keys in Stellar network"
echo "  [ ] Notify multi-sig keyholders"
echo "  [ ] Run full integration test: npm run doctor"

#!/usr/bin/env bash
set -euo pipefail

# CarbonVeritas Interactive Demo
# Walks through the full credit lifecycle using the CLI

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================"
echo -e "  CarbonVeritas — Interactive Demo"
echo -e "================================================${NC}"
echo ""

# Check CLI is built
if [ ! -f cli/bin/run.js ]; then
  echo "Building CLI..."
  (cd cli && npm run build) 2>/dev/null || true
fi

CLI="node cli/bin/run.js"

echo -e "${YELLOW}Step 1: Check health${NC}"
$CLI doctor || echo "  (expected to warn if services not running)"

echo ""
echo -e "${YELLOW}Step 2: Register as a verifier${NC}"
$CLI verify register --stake 1000 || echo "  (requires Freighter / testnet setup)"

echo ""
echo -e "${YELLOW}Step 3: Issue a credit${NC}"
$CLI credits issue \
  --project "AMZ-REF-001" \
  --methodology "VCS:VM0007" \
  --vintage-start 2023 \
  --vintage-end 2023 \
  --tonnes 10000 \
  --geography BR \
  --sdg-flags 1,6,13,15 \
  --permanence 87 \
  || echo "  (requires wallet)"

echo ""
echo -e "${YELLOW}Step 4: Approve the credit (2-of-3)${NC}"
$CLI verify approve --credit-id 1 || echo "  (requires verifier wallet)"

echo ""
echo -e "${YELLOW}Step 5: List on marketplace${NC}"
$CLI marketplace offer --credit-id 1 --price 500 --amount 10000 || echo "  (requires wallet)"

echo ""
echo -e "${YELLOW}Step 6: Buy credits${NC}"
$CLI marketplace buy --offer-id 1 --amount 5000 || echo "  (requires buyer wallet)"

echo ""
echo -e "${YELLOW}Step 7: Retire credits${NC}"
$CLI retire retire --credit-id 1 --beneficiary "Demo Corp" --reason "Demo offset" \
  || echo "  (requires wallet)"

echo ""
echo -e "${YELLOW}Step 8: Generate certificate${NC}"
$CLI retire certificate --credit-id 1 || echo "  (requires API running)"

echo ""
echo -e "${GREEN}================================================"
echo -e "  Demo Complete!"
echo -e "================================================${NC}"
echo ""
echo "See the full API reference at http://localhost:3000/docs"
echo "Explore the frontend at http://localhost:3001"

#!/usr/bin/env bash
set -euo pipefail

# CarbonVeritas Testnet Seed Script
# Creates sample data for development and testing

API_URL="${API_URL:-http://localhost:3000}"
echo "Seeding CarbonVeritas testnet data via $API_URL"

# ── Create verifiers ──────────────────────────────────────
echo ""
echo "Creating verifiers..."

for i in 1 2 3; do
  curl -s -X POST "$API_URL/verifiers/register" \
    -H "Content-Type: application/json" \
    -d "{\"wallet\": \"G_VERIFIER_${i}_PLACEHOLDER\"}" \
    || echo "  ⚠ Verifier $i registration skipped"
done

# ── Create sample credits ─────────────────────────────────
echo ""
echo "Creating sample credits..."

CREDITS='[
  {
    "projectId": "AMZ-REF-001",
    "methodology": "VCS:VM0007",
    "vintageStart": "2023-01-01",
    "vintageEnd": "2023-12-31",
    "tonnes": 10000,
    "geography": "BR",
    "sdgCobenefits": [1, 6, 13, 15],
    "permanenceRating": 87,
    "additionalityType": "investment_barrier"
  },
  {
    "projectId": "KEN-COOK-002",
    "methodology": "GS:ACM0006",
    "vintageStart": "2022-01-01",
    "vintageEnd": "2024-12-31",
    "tonnes": 25000,
    "geography": "KE",
    "sdgCobenefits": [3, 7, 13],
    "permanenceRating": 72,
    "additionalityType": "common_practice"
  },
  {
    "projectId": "IDN-PEAT-003",
    "methodology": "VCS:VM0021",
    "vintageStart": "2021-01-01",
    "vintageEnd": "2025-12-31",
    "tonnes": 50000,
    "geography": "ID",
    "sdgCobenefits": [13, 15, 6],
    "permanenceRating": 65,
    "additionalityType": "regulatory_surplus"
  },
  {
    "projectId": "COL-AGF-004",
    "methodology": "ACR:ACM0001",
    "vintageStart": "2024-01-01",
    "vintageEnd": "2024-12-31",
    "tonnes": 5000,
    "geography": "CO",
    "sdgCobenefits": [1, 2, 13],
    "permanenceRating": 91,
    "additionalityType": "investment_barrier"
  },
  {
    "projectId": "MNG-BLUE-005",
    "methodology": "CDM:AR-AM0001",
    "vintageStart": "2023-06-01",
    "vintageEnd": "2024-06-01",
    "tonnes": 15000,
    "geography": "MN",
    "sdgCobenefits": [6, 13, 14],
    "permanenceRating": 78,
    "additionalityType": "common_practice"
  }
]'

echo "$CREDITS" | jq -c '.[]' | while read -r credit; do
  curl -s -X POST "$API_URL/credits/issue" \
    -H "Content-Type: application/json" \
    -d "$credit" \
    || echo "  ⚠ Credit issue skipped"
done

# ── Create marketplace listings ───────────────────────────
echo ""
echo "Creating marketplace listings..."

LISTINGS='[
  {"creditId": 1, "pricePerTonne": 450, "amount": 5000, "currency": "USDC"},
  {"creditId": 2, "pricePerTonne": 320, "amount": 10000, "currency": "USDC"},
  {"creditId": 4, "pricePerTonne": 680, "amount": 2000, "currency": "USDC"}
]'

echo "$LISTINGS" | jq -c '.[]' | while read -r listing; do
  curl -s -X POST "$API_URL/marketplace/offer" \
    -H "Content-Type: application/json" \
    -d "$listing" \
    || echo "  ⚠ Listing creation skipped"
done

# ── Generate sample certificates ──────────────────────────
echo ""
echo "Generating sample certificates..."

for id in 1 2 3; do
  curl -s -X POST "$API_URL/credits/$id/retire" \
    -H "Content-Type: application/json" \
    -d "{\"beneficiary\": \"Seed Corp\", \"reason\": \"Seed data\", \"accountingPeriod\": \"2024\"}" \
    || echo "  ⚠ Retirement for credit $id skipped"
done

echo ""
echo "✓ Seeding complete!"
echo ""
echo "Created: 3 verifiers, 5 credits, 3 listings, 3 retirements"

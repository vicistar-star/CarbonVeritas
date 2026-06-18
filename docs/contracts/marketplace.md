# Marketplace Contract

## Overview

Peer-to-peer marketplace for carbon credit trading. Supports full and partial fills, fixed-price offers with optional expiry.

## Offer Lifecycle

```
Created ──► Active ──► Filled (full or partial)
                  │
                  ├──► Cancelled (by seller or after expiry)
                  └──► Expired (automatic on timestamp check)
```

On creation, the credit is transferred from seller to the contract (escrow). On fill, the credit is transferred to buyer and payment to seller.

## Fee Calculation

Payment amount: `(buy_amount * price_per_tonne) / 1000`

The `price_per_tonne` is denominated in stroops (1 XLM = 10,000,000 stroops) per millitonne. The division by 1000 converts from millitonnes to whole tonnes.

Protocol fees are handled by the RevenueSplit contract, not the Marketplace.

## Function Reference

### `create_offer(env, seller, credit_id, price_per_tonne, amount, currency, expiry) -> u64`

Creates a sell offer. Credit must be owned by seller and non-retired. The credit is escrowed in the contract. Returns offer ID.

### `buy_credits(env, buyer, offer_id, amount) -> bool`

Purchases from an offer. Supports partial fill. Transfers payment token from buyer to seller, and credit from contract to buyer. Reverts if insufficient available amount or offer expired.

### `cancel_offer(env, caller, offer_id) -> bool`

Cancels an active offer. Only the seller can cancel before expiry; anyone can cancel after expiry. Returns the escrowed credit to seller.

### `get_listings(env, methodology_filter, geography_filter, max_price, offset, limit) -> Vec<Offer>`

Paginated active listings. Returns only `OfferStatus::Active` offers.

## Storage Layout

| Key | Type | Description |
|-----|------|-------------|
| `0` (counter key) | `u64` | Monotonically increasing offer ID |
| `("o", offer_id)` | `Offer` | Offer details |
| `("s", seller)` | `Vec<u64>` | Offers by seller address |
| `"all"` | `Vec<u64>` | All offer IDs for listing |
| `"cr"` | `Address` | CreditRegistry contract address |
| `"adm"` | `Address` | Admin address |

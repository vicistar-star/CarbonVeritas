# CreditRegistry Contract

## Overview

The CreditRegistry is the core contract of CarbonVeritas. It maintains the authoritative on-chain record of all carbon credits, including their metadata, ownership, and approval status.

## Storage Layout

| Key | Type | Description |
|-----|------|-------------|
| `CreditCounter` (DataKey) | `u64` | Monotonically increasing credit ID counter |
| `("c", credit_id)` | `CreditMetadata` | Full credit metadata |
| `("o", credit_id)` | `Address` | Current owner |
| `("a", credit_id)` | `Vec<ApprovalRecord>` | Approval/provenance history |
| `("il", issuer)` | `Vec<u64>` | Credits by issuer |
| `("ol", owner)` | `Vec<u64>` | Credits by owner |
| `"vl"` | `Vec<Address>` | Registered verifier addresses |
| `("b", bridge)` | `bool` | Authorized bridge contracts |
| `ContractConfig` (DataKey) | `ContractConfig` | Admin, thresholds, fees |

## Function Reference

### `submit_credit(env, issuer, metadata, ipfs_hash) -> u64`

Submits a new credit for verifier review. Validates metadata, assigns a monotonically increasing ID, persists the record, and emits `CreditSubmitted`.

### `approve_and_mint(env, verifier, credit_id, comments) -> Option<BytesN<32>>`

Records a verifier's approval. Once `approvals >= verifier_threshold`, sets status to `Active` and generates a token ID via `sha256(credit_id)`. Returns the token ID on mint, `None` if threshold not yet met.

### `reject_credit(env, verifier, credit_id, reason) -> bool`

Records a verifier's rejection. Once `rejections > (quorum - threshold)`, sets status to `Rejected`. Returns `true` if the rejection threshold was met.

### `transfer_credit(env, from, to, credit_id) -> bool`

Transfers ownership of an active, non-retired credit. Requires auth from current owner.

### `mark_retired(env, credit_id)`

Called only by the RetirementTracker contract. Sets credit status to `Retired`. Irreversible.

### `mint_bridged(env, bridge, to, metadata) -> u64`

Called only by authorized bridge contracts. Mints a credit with `Active` status directly (skips verifier approval).

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 100 | `NotAuthorized` | Caller lacks required authorization |
| 101 | `NotFound` | Credit or resource not found |
| 102 | `AlreadyExists` | Duplicate registration |
| 103 | `InvalidInput` | Metadata validation failed |
| 200 | `CreditNotFound` | Credit ID does not exist |
| 201 | `CreditNotPending` | Credit is not in Pending state |
| 202 | `CreditNotActive` | Credit is not Active |
| 203 | `CreditAlreadyRetired` | Credit is already retired |
| 205 | `CreditNotOwned` | Caller does not own the credit |
| 209 | `AlreadyVoted` | Verifier already submitted a decision |

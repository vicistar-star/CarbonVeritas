# MerkleBridge Contract

## Overview

Cryptographically ports credits from legacy registries (Verra, Gold Standard, CDM) onto Stellar. Uses Merkle inclusion proofs to verify that a credit existed in the source registry without trusting any intermediary.

## Merkle Proof Verification Spec

The `verify_proof` function uses SHA-256 and standard binary Merkle tree construction:

1. Start with the `leaf` hash as the current computed hash.
2. For each sibling in `proof` (ordered from leaf to root):
   - Sort the current hash and sibling hash lexicographically (by byte value).
   - Concatenate: `[left (32 bytes)] ++ [right (32 bytes)]`.
   - Compute `sha256(concatenated)` as the new current hash.
3. After processing all siblings, compare `computed == root`.

### Edge Cases Handled

- **Empty proof**: Returns `leaf == root` (trivial tree of one leaf).
- **Zero-length root**: Validated by the registry root update flow; admin cannot set an empty root.
- **Duplicate bridge**: `is_bridged` check prevents double-minting the same source serial.
- **Registry not found**: `bridge_in` panics if the source registry has no configured root.

## Supported Registries

| Registry | Identifier | Notes |
|----------|-----------|-------|
| Verra (VCS) | `VERRA` | Most widely used voluntary registry |
| Gold Standard | `GOLD_STANDARD` | GS4GG methodology |
| CDM (UNFCCC) | `CDM` | Kyoto Protocol baseline |
| ACR | `ACR` | American Carbon Registry |
| CAR | `CAR` | Climate Action Reserve |

Additional registries can be added by the admin via `update_registry_root`.

## Function Reference

### `bridge_in(env, bridger, source_registry, source_serial, leaf, merkle_proof, metadata) -> u64`

Verifies the Merkle proof, checks for duplicate bridge, then calls `CreditRegistry.mint_bridged` to create the credit. Returns the new Stellar credit ID.

### `bridge_out(env, owner, credit_id) -> bool`

Burns a bridged credit on Stellar (marks it retired) so it can be retired on the source registry. Requires ownership.

### `verify_proof(env, leaf, proof, root) -> bool`

Pure Merkle proof verification. Does not modify state.

### `update_registry_root(env, admin, registry, new_root, block_height) -> bool`

Admin-only. Updates the stored Merkle root for a registry. Includes block height for audit trail.

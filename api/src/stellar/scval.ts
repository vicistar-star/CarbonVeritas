import {
  Address,
  ScInt,
  StrKey,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

/**
 * Low-level ScVal encoding helpers matching the `#[contracttype]` structs
 * declared in `contracts/shared/src/credit_metadata.rs`.
 *
 * soroban-sdk encodes contracttype structs as `ScVal::Vec` with each field
 * appearing in declaration order, and `#[repr(u32)]` enums as `ScVal::U32`.
 * These helpers mirror that layout so API callers can construct exact
 * contract-call arguments and decode read results.
 */

export type RawScVal = xdr.ScVal;

export function scAddress(addr: string): RawScVal {
  if (!StrKey.isValidEd25519PublicKey(addr)) {
    throw new Error(`Invalid Stellar address: ${addr}`);
  }
  return new Address(addr).toScVal();
}

export function scString(value: string): RawScVal {
  return xdr.ScVal.scvString(value);
}

export function scU32(value: number): RawScVal {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid u32 value: ${value}`);
  }
  return xdr.ScVal.scvU32(value);
}

export function scU64(value: number | bigint): RawScVal {
  if (typeof value !== 'bigint' && !Number.isInteger(value)) {
    throw new Error(`Invalid u64 value: ${value}`);
  }
  return xdr.ScVal.scvU64(xdr.Uint64.fromString(String(value)));
}

export function scI128(value: number | bigint): RawScVal {
  return new ScInt(value).toI128();
}

export function scBool(value: boolean): RawScVal {
  return xdr.ScVal.scvBool(value);
}

/** BytesN<32> from a 64-character hex string. */
export function scBytes32(hex: string): RawScVal {
  const buf = hexToBytes(hex);
  if (buf.length !== 32) {
    throw new Error(`BytesN<32> requires 32 bytes, got ${buf.length}`);
  }
  return xdr.ScVal.scvBytes(buf);
}

/** Option<u64>: None is an empty Vec, Some(n) is a single-element Vec. */
export function scOptionU64(value: number | bigint | null | undefined): RawScVal {
  if (value === null || value === undefined) {
    return xdr.ScVal.scvVec([]);
  }
  return xdr.ScVal.scvVec([scU64(value)]);
}

/** Struct: `ScVal::Vec` of fields in declaration order. */
export function scStruct(fields: RawScVal[]): RawScVal {
  return xdr.ScVal.scvVec(fields);
}

/** Generic Vec<T> from already-encoded element ScVals. */
export function scVec(elements: RawScVal[]): RawScVal {
  return xdr.ScVal.scvVec(elements);
}

/** Option<String>: empty Vec for None, single-element Vec for Some. */
export function scOptionString(
  value: string | null | undefined,
): RawScVal {
  return value === null || value === undefined
    ? xdr.ScVal.scvVec([])
    : xdr.ScVal.scvVec([scString(value)]);
}

/** Option<i128>: empty Vec for None, single-element Vec for Some. */
export function scOptionI128(
  value: number | bigint | null | undefined,
): RawScVal {
  return value === null || value === undefined
    ? xdr.ScVal.scvVec([])
    : xdr.ScVal.scvVec([scI128(value)]);
}

/** Vec<BytesN<32>> from a list of 64-char hex strings. */
export function scVecBytes32(hexList: string[]): RawScVal {
  return xdr.ScVal.scvVec(hexList.map(scBytes32));
}

export function bytesToHex(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('hex');
}

export function hexToBytes(hex: string): Buffer {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return Buffer.from(hex, 'hex');
}

export const METADATA_FIELDS = [
  'projectId',
  'methodology',
  'vintageStart',
  'vintageEnd',
  'tonnes',
  'geography',
  'serialPrefix',
  'sdgFlags',
  'permanenceRating',
  'bufferContributionPct',
  'additionalityType',
  'ipfsHash',
  'status',
  'createdAt',
  'tokenId',
] as const;

export type CreditMetadataInput = {
  projectId?: string;
  methodology?: string;
  vintageStart?: number | bigint;
  vintageEnd?: number | bigint;
  tonnes?: number | bigint;
  geography?: string;
  serialPrefix?: string;
  sdgFlags?: number;
  permanenceRating?: number;
  bufferContributionPct?: number;
  additionalityType?: number;
  ipfsHash?: string;
  status?: number;
  createdAt?: number | bigint;
  tokenId?: string;
};

/**
 * Encode a `CreditMetadata` struct. The contract overwrites `status`,
 * `created_at`, `ipfs_hash` and `token_id` on submission, so those can be
 * omitted or left empty when building a submission argument.
 */
export function toCreditMetadataScVal(input: CreditMetadataInput): RawScVal {
  return scStruct([
    scString(input.projectId ?? ''),
    scString(input.methodology ?? ''),
    scU64(input.vintageStart ?? 0),
    scU64(input.vintageEnd ?? 0),
    scI128(input.tonnes ?? 0),
    scString(input.geography ?? ''),
    scString(input.serialPrefix ?? ''),
    scU32(input.sdgFlags ?? 0),
    scU32(input.permanenceRating ?? 0),
    scU32(input.bufferContributionPct ?? 0),
    scU32(input.additionalityType ?? 0),
    scString(input.ipfsHash ?? ''),
    scU32(input.status ?? 0),
    scU64(input.createdAt ?? 0),
    input.tokenId ? scBytes32(input.tokenId) : xdr.ScVal.scvBytes(Buffer.alloc(32)),
  ]);
}

export const APPROVAL_FIELDS = [
  'verifier',
  'approved',
  'timestamp',
  'comments',
] as const;

export const OFFER_FIELDS = [
  'offerId',
  'seller',
  'creditId',
  'pricePerTonne',
  'amount',
  'filled',
  'currency',
  'expiry',
  'createdAt',
  'status',
] as const;

export const RETIREMENT_FIELDS = [
  'creditId',
  'retiredBy',
  'beneficiary',
  'reason',
  'accountingPeriod',
  'tonnesRetired',
  'txHash',
  'ledgerSequence',
  'timestamp',
  'certificateHash',
] as const;

export const VERIFIER_FIELDS = [
  'address',
  'totalStaked',
  'reputationScore',
  'approvalCount',
  'rejectionCount',
  'lastHeartbeat',
  'registeredAt',
] as const;

const CONFIG_FIELDS = [
  'admin',
  'verifierThreshold',
  'verifierQuorum',
  'approvalWindow',
  'protocolFeeBps',
  'bufferPoolPct',
] as const;

export const CONFIG_FIELDS_MAP = CONFIG_FIELDS;

/**
 * Decode a struct `ScVal::Vec` into a plain object using a field-name map.
 * Numbers arrive as BigInt from the SDK where required; callers that need a
 * JSON-safe shape can pass them through `bigintToNumber`.
 */
function decodeStruct(fields: readonly string[], sv: RawScVal): Record<string, unknown> {
  const values = scValToNative(sv);
  if (!Array.isArray(values)) {
    throw new Error(`Expected struct Vec, got ${typeof values}`);
  }
  return zipNativeFields(fields, values);
}

/**
 * Map an already-decoded native struct array (from `scValToNative`) onto a
 * field-name map. Used when a contract call returns the struct as a native
 * value rather than a raw ScVal.
 */
export function zipNativeFields(
  fields: readonly string[],
  values: unknown[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  fields.forEach((name, i) => {
    out[name] = i < values.length ? values[i] : undefined;
  });
  return out;
}

export function decodeCreditMetadata(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(METADATA_FIELDS, sv);
}

export function decodeApprovalRecord(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(APPROVAL_FIELDS, sv);
}

export function decodeOffer(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(OFFER_FIELDS, sv);
}

export function decodeRetirementRecord(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(RETIREMENT_FIELDS, sv);
}

export function decodeVerifier(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(VERIFIER_FIELDS, sv);
}

export function decodeContractConfig(sv: RawScVal): Record<string, unknown> {
  return decodeStruct(CONFIG_FIELDS, sv);
}

export function decodeNative(sv: RawScVal): unknown {
  return scValToNative(sv);
}

export function bigintToNumber(value: unknown): unknown {
  return typeof value === 'bigint' ? Number(value) : value;
}

/** Convenience: `Option<BytesN<32>>` → hex string or null. */
export function decodeOptionBytes32Hex(sv: RawScVal): string | null {
  const native = scValToNative(sv);
  if (native === null) return null;
  if (Array.isArray(native)) {
    if (native.length === 0) return null;
    const first = native[0];
    return first instanceof Buffer ? bytesToHex(first) : null;
  }
  return native instanceof Buffer ? bytesToHex(native) : null;
}

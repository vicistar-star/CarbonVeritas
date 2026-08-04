import {
  Keypair,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import {
  bytesToHex,
  decodeApprovalRecord,
  decodeCreditMetadata,
  decodeOffer,
  decodeOptionBytes32Hex,
  decodeVerifier,
  hexToBytes,
  scAddress,
  scBytes32,
  scI128,
  scOptionI128,
  scOptionString,
  scOptionU64,
  scU32,
  scU64,
  scVecBytes32,
  toCreditMetadataScVal,
} from '../../src/stellar/scval';

describe('ScVal helpers', () => {
  const account = Keypair.random().publicKey();

  it('encodes addresses as ScVal::Address', () => {
    const sv = scAddress(account);
    expect(sv.switch().name).toBe('scvAddress');
    expect(scValToNative(sv)).toBe(account);
  });

  it('rejects malformed addresses', () => {
    expect(() => scAddress('not-an-address')).toThrow('Invalid Stellar address');
  });

  it('encodes u32/u64/i128 and decodes them back', () => {
    expect(scValToNative(scU32(7))).toBe(7);
    expect(scValToNative(scU64(42))).toBe(42n);
    expect(scValToNative(scI128(12345))).toBe(12345n);
  });

  it('encodes BytesN<32> and validates length', () => {
    const sv = scBytes32('ab'.repeat(32));
    expect(scValToNative(sv)).toEqual(Buffer.alloc(32, 0xab));
    expect(() => scBytes32('ab')).toThrow('requires 32 bytes');
  });

  it('encodes Vec<BytesN<32>> proofs', () => {
    const sv = scVecBytes32(['01'.repeat(32), '02'.repeat(32)]);
    const native = scValToNative(sv) as Buffer[];
    expect(native).toHaveLength(2);
    expect(bytesToHex(native[0])).toBe('01'.repeat(32));
  });

  it('encodes Option values as empty or single-element Vecs', () => {
    expect(scValToNative(scOptionU64(null))).toEqual([]);
    expect(scValToNative(scOptionU64(5))).toEqual([5n]);
    expect(scValToNative(scOptionString('hi'))).toEqual(['hi']);
    expect(scValToNative(scOptionString(null))).toEqual([]);
    expect(scValToNative(scOptionI128(9))).toEqual([9n]);
    expect(scValToNative(scOptionI128(undefined))).toEqual([]);
  });

  it('round-trips CreditMetadata struct fields in declaration order', () => {
    const input = {
      projectId: 'P-123',
      methodology: 'AM0001',
      vintageStart: 1700000000,
      vintageEnd: 1767225600,
      tonnes: 2500,
      geography: 'KENYA',
      serialPrefix: 'P-123-AM0001-',
      sdgFlags: 6,
      permanenceRating: 80,
      bufferContributionPct: 10,
      additionalityType: 1,
      ipfsHash: 'bafy123',
      status: 0,
      createdAt: 1700000000,
      tokenId: 'aa'.repeat(32),
    };

    const sv = toCreditMetadataScVal(input);
    expect(sv.switch().name).toBe('scvVec');

    const decoded = decodeCreditMetadata(sv);
    expect(decoded.projectId).toBe('P-123');
    expect(decoded.methodology).toBe('AM0001');
    expect(decoded.vintageStart).toBe(1700000000n);
    expect(decoded.tonnes).toBe(2500n);
    expect(decoded.geography).toBe('KENYA');
    expect(decoded.sdgFlags).toBe(6);
    expect(decoded.ipfsHash).toBe('bafy123');
    expect(decoded.status).toBe(0);
    expect(decoded.tokenId).toEqual(Buffer.alloc(32, 0xaa));

    // fields that can be omitted must still appear (positional Vec)
    const minimal = decodeCreditMetadata(
      toCreditMetadataScVal({ projectId: 'P-1' }),
    );
    expect(minimal.projectId).toBe('P-1');
    expect(minimal.tonnes).toBe(0n);
    expect(minimal.tokenId).toEqual(Buffer.alloc(32));
  });

  it('decodes ApprovalRecord structs', () => {
    const sv = xdr.ScVal.scvVec([
      scAddress(account),
      xdr.ScVal.scvBool(true),
      scU64(1700000000),
      xdr.ScVal.scvString('approved after audit'),
    ]);
    const record = decodeApprovalRecord(sv);
    expect(record.verifier).toBe(account);
    expect(record.approved).toBe(true);
    expect(record.timestamp).toBe(1700000000n);
    expect(record.comments).toBe('approved after audit');
  });

  it('decodes Offer structs including Option<u64> expiry', () => {
    const sv = xdr.ScVal.scvVec([
      scU64(9),
      scAddress(account),
      scU64(4),
      scI128(100),
      scI128(50),
      scI128(10),
      scAddress(account),
      scOptionU64(1800000000),
      scU64(1700000000),
      scU32(0),
    ]);
    const offer = decodeOffer(sv);
    expect(offer.offerId).toBe(9n);
    expect(offer.pricePerTonne).toBe(100n);
    expect(offer.expiry).toEqual([1800000000n]);
    expect(offer.status).toBe(0);
  });

  it('decodes Verifier structs', () => {
    const sv = xdr.ScVal.scvVec([
      scAddress(account),
      scI128(50000),
      scU32(100),
      scU32(2),
      scU32(0),
      scU64(1700000000),
      scU64(1699999999),
    ]);
    const v = decodeVerifier(sv);
    expect(v.address).toBe(account);
    expect(v.totalStaked).toBe(50000n);
    expect(v.reputationScore).toBe(100);
    expect(v.lastHeartbeat).toBe(1700000000n);
  });

  it('decodes Option<BytesN<32>> to hex or null', () => {
    expect(decodeOptionBytes32Hex(xdr.ScVal.scvVec([]))).toBeNull();
    expect(
      decodeOptionBytes32Hex(xdr.ScVal.scvVec([xdr.ScVal.scvBytes(Buffer.alloc(32, 3))])),
    ).toBe('03'.repeat(32));
  });

  it('hex helpers validate input', () => {
    expect(bytesToHex(hexToBytes('aabb'))).toBe('aabb');
    expect(() => hexToBytes('abc')).toThrow('Invalid hex');
    expect(() => hexToBytes('zz')).toThrow('Invalid hex');
  });

  it('nested struct vectors survive scValToNative with element order', () => {
    const inner = xdr.ScVal.scvVec([scU32(1), xdr.ScVal.scvString('a')]);
    const outer = xdr.ScVal.scvVec([inner, inner]);
    const native = scValToNative(outer);
    expect(native).toEqual([
      [1, 'a'],
      [1, 'a'],
    ]);
  });
});

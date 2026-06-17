import { AuthService } from '../../src/auth/auth.service';
import { IpfsService } from '../../src/ipfs/ipfs.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { createPrismaMock } from './service-mocks';

describe('AuthService', () => {
  it('generates wallet-scoped SEP-10 challenge text', async () => {
    const service = new AuthService({ sign: jest.fn() } as never, createPrismaMock() as never);

    await expect(service.generateChallenge('GWALLET')).resolves.toEqual({
      challenge: expect.stringContaining('GWALLET'),
    });
  });

  it('creates users on first token exchange and signs a JWT payload', async () => {
    const prisma = createPrismaMock();
    const jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', stellarPub: 'GWALLET' });
    const service = new AuthService(jwt as never, prisma as never);

    await expect(service.exchangeToken('GWALLET', 'signed')).resolves.toEqual({ accessToken: 'jwt-token' });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-1', wallet: 'GWALLET' });
  });
});

describe('StellarService', () => {
  it('returns deterministic mock results for Soroban call wrappers', async () => {
    const service = new StellarService({} as never);

    await expect(service.submitCredit('GISSUER', {}, 'bafy123')).resolves.toBe('pending-tx-hash');
    await expect(service.approveAndMint('GVERIFIER', 1, 'ok')).resolves.toBe('tx-hash-placeholder');
    await expect(service.buyCredits('GBUYER', 2, 5)).resolves.toBe(true);
    await expect(service.retire('GOWNER', 1, 'offset', 'Acme', '2026-06')).resolves.toMatchObject({
      creditId: 1,
      txHash: '0xplaceholder',
    });
  });
});

describe('IpfsService', () => {
  it('pins files and json payloads with stable mock hashes', async () => {
    const service = new IpfsService({} as never);

    await expect(service.pinFile(Buffer.from('hello'), 'hello.txt')).resolves.toMatchObject({ pinSize: 5 });
    await expect(service.pinJson({ projectId: 'P-1' })).resolves.toMatchObject({
      ipfsHash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    });
  });
});

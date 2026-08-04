import { AuthService } from '../../src/auth/auth.service';
import { IpfsService } from '../../src/ipfs/ipfs.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { createPrismaMock } from './service-mocks';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  WebAuth,
} from '@stellar/stellar-sdk';

describe('AuthService', () => {
  const server = Keypair.random();
  const client = Keypair.random();
  const homeDomain = 'api.carbonveritas.io';
  const networkPassphrase = Networks.TESTNET;

  function createConfigMock(overrides: Record<string, string> = {}) {
    const values: Record<string, string> = {
      SEP10_SIGNING_KEY: server.secret(),
      SEP10_HOME_DOMAIN: homeDomain,
      STELLAR_NETWORK_PASSPHRASE: networkPassphrase,
      STELLAR_NETWORK: 'testnet',
      ...overrides,
    };
    return { get: jest.fn((key: string) => values[key] ?? undefined) };
  }

  function signChallenge(challengeXdr: string): string {
    const tx = TransactionBuilder.fromXDR(challengeXdr, networkPassphrase);
    tx.sign(client);
    return tx.toEnvelope().toXDR('base64');
  }

  it('issues a real SEP-10 challenge transaction bound to the wallet', async () => {
    const prisma = createPrismaMock();
    prisma.challenge.create.mockResolvedValue({
      id: 'challenge-1',
      wallet: client.publicKey(),
      transaction: 'xdr',
      expiresAt: new Date(),
      usedAt: null,
    });
    const service = new AuthService(
      { sign: jest.fn() } as never,
      prisma as never,
      createConfigMock() as never,
    );

    const result = await service.generateChallenge(client.publicKey());

    expect(result.transaction).toEqual(expect.any(String));
    expect(result.homeDomain).toBe(homeDomain);
    expect(result.challengeId).toBe('challenge-1');

    const { clientAccountID } = WebAuth.readChallengeTx(
      result.transaction,
      server.publicKey(),
      networkPassphrase,
      homeDomain,
      homeDomain,
    );
    expect(clientAccountID).toBe(client.publicKey());
  });

  it('rejects an invalid Stellar public key when requesting a challenge', async () => {
    const service = new AuthService(
      { sign: jest.fn() } as never,
      createPrismaMock() as never,
      createConfigMock() as never,
    );

    await expect(service.generateChallenge('not-a-key')).rejects.toThrow();
  });

  it('authenticates a wallet that signs the challenge and returns JWTs', async () => {
    const prisma = createPrismaMock();
    prisma.challenge.findUnique.mockResolvedValue({
      id: 'challenge-1',
      wallet: client.publicKey(),
      transaction: 'xdr',
      expiresAt: new Date(Date.now() + 300_000),
      usedAt: null,
    });
    prisma.challenge.update.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', stellarPub: client.publicKey() });

    const jwt = {
      sign: jest
        .fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token'),
    };
    const service = new AuthService(
      jwt as never,
      prisma as never,
      createConfigMock() as never,
    );

    const challengeXdr = WebAuth.buildChallengeTx(
      server,
      client.publicKey(),
      homeDomain,
      300,
      networkPassphrase,
      homeDomain,
    );

    const tokens = await service.exchangeToken(
      client.publicKey(),
      signChallenge(challengeXdr),
      'challenge-1',
    );

    expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(prisma.challenge.update).toHaveBeenCalledWith({
      where: { id: 'challenge-1' },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('rejects a challenge signed by the wrong wallet', async () => {
    const prisma = createPrismaMock();
    prisma.challenge.findUnique.mockResolvedValue({
      id: 'challenge-1',
      wallet: client.publicKey(),
      transaction: 'xdr',
      expiresAt: new Date(Date.now() + 300_000),
      usedAt: null,
    });
    const service = new AuthService(
      { sign: jest.fn() } as never,
      prisma as never,
      createConfigMock() as never,
    );

    const challengeXdr = WebAuth.buildChallengeTx(
      server,
      client.publicKey(),
      homeDomain,
      300,
      networkPassphrase,
      homeDomain,
    );

    await expect(
      service.exchangeToken(client.publicKey(), challengeXdr, 'challenge-1'),
    ).rejects.toThrow('Invalid challenge signature');
  });

  it('rejects a replayed challenge', async () => {
    const prisma = createPrismaMock();
    prisma.challenge.findUnique.mockResolvedValue({
      id: 'challenge-1',
      wallet: client.publicKey(),
      transaction: 'xdr',
      expiresAt: new Date(Date.now() + 300_000),
      usedAt: new Date(),
    });
    const service = new AuthService(
      { sign: jest.fn() } as never,
      prisma as never,
      createConfigMock() as never,
    );

    await expect(
      service.exchangeToken(client.publicKey(), 'signed', 'challenge-1'),
    ).rejects.toThrow('already been used');
  });

  it('rejects an expired challenge', async () => {
    const prisma = createPrismaMock();
    prisma.challenge.findUnique.mockResolvedValue({
      id: 'challenge-1',
      wallet: client.publicKey(),
      transaction: 'xdr',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    const service = new AuthService(
      { sign: jest.fn() } as never,
      prisma as never,
      createConfigMock() as never,
    );

    await expect(
      service.exchangeToken(client.publicKey(), 'signed', 'challenge-1'),
    ).rejects.toThrow('expired');
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

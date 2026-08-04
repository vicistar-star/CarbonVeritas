import { AuthService } from '../../src/auth/auth.service';
import { IpfsService } from '../../src/ipfs/ipfs.service';
import { SorobanError } from '../../src/stellar/soroban-client';
import { StellarService } from '../../src/stellar/stellar.service';
import { createPrismaMock } from './service-mocks';
import {
  Keypair,
  Networks,
  StrKey,
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
  const admin = Keypair.random();
  const verifier = Keypair.random();
  const registryContract = StrKey.encodeContract(Buffer.alloc(32, 1));
  const trackerContract = StrKey.encodeContract(Buffer.alloc(32, 2));
  const marketplaceContract = StrKey.encodeContract(Buffer.alloc(32, 3));
  const adminSecret = admin.secret();
  const verifierSecret = verifier.secret();

  const makeService = (soroban: unknown) => {
    const config = {
      get: (key: string) =>
        ({
          CREDIT_REGISTRY_CONTRACT: registryContract,
          RETIREMENT_TRACKER_CONTRACT: trackerContract,
          MARKETPLACE_CONTRACT: marketplaceContract,
          STELLAR_ADMIN_SECRET_KEY: adminSecret,
          STELLAR_VERIFIER_SECRET_KEY: verifierSecret,
        })[key],
    };
    const service = new StellarService(config as never, soroban as never);
    return service;
  };

  it('submits a real submit_credit call and returns the tx hash', async () => {
    const invoke = jest.fn().mockResolvedValue({
      hash: 'tx-credit-1',
      status: 'SUCCESS',
      returnValue: 42n,
    });
    const service = makeService({ invoke });

    await expect(
      service.submitCredit(admin.publicKey(), { projectId: 'P-1' }, 'bafy123'),
    ).resolves.toBe('tx-credit-1');

    expect(invoke).toHaveBeenCalledWith({
      contractId: registryContract,
      method: 'submit_credit',
      signerSecret: adminSecret,
      args: expect.any(Array),
    });
  });

  it('decodes approve_and_mint Some(BytesN<32>) into a token id', async () => {
    const invoke = jest.fn().mockResolvedValue({
      hash: 'tx-approve',
      status: 'SUCCESS',
      returnValue: [Buffer.alloc(32, 9)],
    });
    const service = makeService({ invoke });

    await expect(
      service.approveAndMint(verifier.publicKey(), 1, 'ok'),
    ).resolves.toBe('09'.repeat(32));
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: registryContract,
        method: 'approve_and_mint',
        signerSecret: verifierSecret,
      }),
    );
  });

  it('maps a RetirementRecord native value onto the retire result', async () => {
    const invoke = jest.fn().mockResolvedValue({
      hash: 'tx-retire',
      status: 'SUCCESS',
      returnValue: [
        7n,
        admin.publicKey(),
        'Acme',
        'offsetting 2026',
        '2026-06',
        10n,
        Buffer.alloc(32, 1),
        12345,
        1700000000n,
        Buffer.alloc(32, 2),
      ],
    });
    const service = makeService({ invoke });

    const result = await service.retire(
      admin.publicKey(),
      7,
      'offsetting 2026',
      'Acme',
      '2026-06',
    );

    expect(result).toMatchObject({
      creditId: 7,
      retiredBy: admin.publicKey(),
      beneficiary: 'Acme',
      txHash: 'tx-retire',
      ledgerSequence: 12345,
    });
  });

  it('returns true when buy_credits succeeds', async () => {
    const invoke = jest.fn().mockResolvedValue({
      hash: 'tx-buy',
      status: 'SUCCESS',
      returnValue: true,
    });
    const service = makeService({ invoke });

    await expect(service.buyCredits(admin.publicKey(), 2, 5)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: marketplaceContract,
        method: 'buy_credits',
      }),
    );
  });

  it('raises BadGateway when Soroban rejects a call', async () => {
    const invoke = jest.fn().mockRejectedValue(
      new SorobanError('Contract call submit_credit rejected: xdr'),
    );
    const service = makeService({ invoke });

    await expect(
      service.submitCredit(admin.publicKey(), {}, 'bafy'),
    ).rejects.toThrow('rejected: xdr');
  });

  it('fails fast when contract addresses are not configured', async () => {
    const invoke = jest.fn();
    const service = makeService({ invoke });

    const leaf = '01'.repeat(32);
    const root = '02'.repeat(32);

    await expect(service.verifyProof(leaf, [root], root)).rejects.toThrow(
      'MERKLE_BRIDGE_CONTRACT is not configured',
    );
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

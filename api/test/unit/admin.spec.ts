import { BadRequestException } from '@nestjs/common';
import { Keypair, scValToNative } from '@stellar/stellar-sdk';
import { AdminGuard } from '../../src/admin/admin.guard';
import { AdminService } from '../../src/admin/admin.service';
import {
  scAddress,
  scI128,
  scU32,
  scU64,
  scVec,
} from '../../src/stellar/scval';
import { createPrismaMock } from './service-mocks';

const adminKeypair = Keypair.random();
const verifierKeypair = Keypair.random();

function createSorobanMock() {
  return {
    readScVal: jest.fn(),
    read: jest.fn(),
    invoke: jest.fn(),
    getLatestLedger: jest.fn(),
  };
}

function createConfig(getter: Record<string, unknown> = {}) {
  return { get: jest.fn((key: string) => getter[key]) };
}

function contractConfigScVal() {
  return scVec([
    scAddress(adminKeypair.publicKey()),
    scU32(2),
    scU32(3),
    scU64(604800),
    scU32(50),
    scU32(10),
  ]);
}

describe('AdminService', () => {
  const CONFIG = {
    CREDIT_REGISTRY_CONTRACT: 'C1',
    VERIFIER_STAKE_CONTRACT: 'C2',
    STELLAR_ADMIN_PUBLIC_KEY: adminKeypair.publicKey(),
    STELLAR_ADMIN_SECRET_KEY: adminKeypair.secret(),
  };

  let prisma: ReturnType<typeof createPrismaMock>;
  let soroban: ReturnType<typeof createSorobanMock>;
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    soroban = createSorobanMock();
    service = new AdminService(
      createConfig(CONFIG) as never,
      prisma as never,
      soroban as never,
    );
  });

  it('reads and decodes protocol config from the registry', async () => {
    soroban.readScVal.mockResolvedValue(contractConfigScVal());

    const result = await service.getProtocolConfig();

    expect(result).toMatchObject({
      admin: adminKeypair.publicKey(),
      verifierThreshold: 2,
      verifierQuorum: 3,
      protocolFeeBps: 50,
      bufferPoolPct: 10,
    });
    expect(result.approvalWindow).toBe(604800n);
    expect(soroban.readScVal).toHaveBeenCalledWith({
      contractId: 'C1',
      method: 'get_config',
      args: [],
    });
  });

  it('returns 400 when the registry contract is not configured', async () => {
    const bare = new AdminService(
      createConfig() as never,
      prisma as never,
      soroban as never,
    );
    await expect(bare.getProtocolConfig()).rejects.toThrow(BadRequestException);
  });

  it('invokes update_config with the admin-signed payload', async () => {
    soroban.invoke.mockResolvedValue({ hash: 'tx-hash', status: 'SUCCESS', returnValue: true });

    const ok = await service.updateProtocolConfig({
      verifierThreshold: 1,
      verifierQuorum: 2,
      approvalWindow: 604800,
      protocolFeeBps: 50,
      bufferPoolPct: 10,
    });

    expect(ok).toBe(true);
    const call = soroban.invoke.mock.calls[0][0];
    expect(call.method).toBe('update_config');
    expect(call.signerSecret).toBe(adminKeypair.secret());
    expect(call.args.map(scValToNative)).toEqual([
      adminKeypair.publicKey(),
      1,
      2,
      604800n,
      50,
      10,
    ]);
  });

  it('returns the configured contract registry', () => {
    expect(service.getContracts()).toEqual({
      CREDIT_REGISTRY_CONTRACT: 'C1',
      MARKETPLACE_CONTRACT: null,
      RETIREMENT_TRACKER_CONTRACT: null,
      VERIFIER_STAKE_CONTRACT: 'C2',
      MERKLE_BRIDGE_CONTRACT: null,
      REVENUE_SPLIT_CONTRACT: null,
    });
  });

  it('maps get_all_verifiers rows onto fields', async () => {
    const row = scVec([
      scAddress(verifierKeypair.publicKey()),
      scI128(1000),
      scU32(100),
      scU32(3),
      scU32(0),
      scU64(1000),
      scU64(900),
    ]);
    soroban.read.mockResolvedValue([scValToNative(row)]);

    const result = await service.listVerifiers();

    expect(result).toEqual([
      {
        address: verifierKeypair.publicKey(),
        totalStaked: 1000n,
        reputationScore: 100,
        approvalCount: 3,
        rejectionCount: 0,
        lastHeartbeat: 1000n,
        registeredAt: 900n,
      },
    ]);
  });

  it('adds and removes verifiers through the registry', async () => {
    soroban.invoke.mockResolvedValue({ hash: 'h', status: 'SUCCESS', returnValue: null });

    await service.addVerifier(verifierKeypair.publicKey());
    expect(soroban.invoke.mock.calls[0][0]).toMatchObject({ method: 'add_verifier' });

    await service.removeVerifier(verifierKeypair.publicKey());
    expect(soroban.invoke.mock.calls[1][0]).toMatchObject({ method: 'remove_verifier' });
  });

  it('reports DB counts and RPC ledger health', async () => {
    prisma.user.count.mockResolvedValue(4);
    prisma.credit.count.mockResolvedValue(10);
    prisma.verifier.count.mockResolvedValue(2);
    prisma.offer.count.mockResolvedValue(3);
    prisma.retirement.count.mockResolvedValue(1);
    prisma.webhook.count.mockResolvedValue(5);
    soroban.getLatestLedger.mockResolvedValue({
      sequence: 123,
      ledgerHash: 'abc123',
    });

    const status = await service.getSystemStatus();

    expect(status).toMatchObject({
      network: { connected: true, sequence: 123, ledgerHash: 'abc123' },
      counts: { users: 4, credits: 10, verifiers: 2, offers: 3, retirements: 1, webhooks: 5 },
    });
  });

  it('marks the network disconnected when RPC is unreachable', async () => {
    soroban.getLatestLedger.mockRejectedValue(new Error('boom'));
    const status = await service.getSystemStatus();
    expect(status.network).toEqual({ connected: false });
  });
});

describe('AdminGuard', () => {
  function runGuard(wallet: string | undefined, admins: string) {
    const config = createConfig({ ADMIN_WALLETS: admins });
    const guard = new AdminGuard(config as never);
    const request = { user: wallet ? { wallet } : undefined };
    return () =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never);
  }

  it('admits wallets on the ADMIN_WALLETS allowlist', () => {
    expect(runGuard('GWALLET1', 'GWALLET1,GWALLET2')()).toBe(true);
  });

  it('rejects wallets not on the allowlist', () => {
    expect(runGuard('GOTHER', 'GWALLET1')).toThrow(
      'Administrator privileges required',
    );
  });

  it('rejects unauthenticated requests', () => {
    expect(runGuard(undefined, 'GWALLET1')).toThrow(
      'Administrator privileges required',
    );
  });
});

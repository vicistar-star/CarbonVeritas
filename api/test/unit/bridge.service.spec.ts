import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BridgeService } from '../../src/bridge/bridge.service';
import { createPrismaMock, createStellarMock } from './service-mocks';

describe('BridgeService', () => {
  const user = { id: 'user-1', stellarPub: 'GBRIDGER' };
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let service: BridgeService;

  const bridgeInDto = {
    sourceRegistry: 'VERRA',
    sourceSerial: 'VCS-1500-00034567-2023',
    leaf: 'ab'.repeat(32),
    merkleProof: ['cd'.repeat(32)],
    merkleRoot: 'ef'.repeat(32),
    metadata: {
      projectId: 'VCS-1500-AMZ-001',
      methodology: 'VCS:VM0007',
      vintageStart: 1704067200,
      vintageEnd: 1735689600,
      tonnes: 10000000,
      geography: 'BR',
      serialPrefix: 'VCS-1500-',
    },
  } as never;

  const bridgeRecord = {
    id: 'bridge-1',
    creditId: 5,
    sourceRegistry: 'VERRA',
    sourceSerial: 'VCS-1500-00034567-2023',
    merkleRoot: 'ef'.repeat(32),
    status: 'INBOUND',
    bridgerId: 'user-1',
    txHash: 'tx-bridge-in',
    timestamp: new Date('2026-08-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    service = new BridgeService(prisma as never, stellar as never);
  });

  it('bridges a credit in after verifying the merkle proof', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    stellar.verifyProof.mockResolvedValue(true);
    stellar.bridgeIn.mockResolvedValue({ creditId: 5, txHash: 'tx-bridge-in' });
    prisma.bridgeRecord.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'bridge-1', ...data }),
    );

    const record = await service.bridgeIn(user.id, user.stellarPub, bridgeInDto);

    expect(stellar.verifyProof).toHaveBeenCalledWith(
      'ab'.repeat(32),
      ['cd'.repeat(32)],
      'ef'.repeat(32),
    );
    expect(stellar.bridgeIn).toHaveBeenCalledWith(
      user.stellarPub,
      'VERRA',
      'VCS-1500-00034567-2023',
      ['ab'.repeat(32), 'cd'.repeat(32)],
      'ef'.repeat(32),
      expect.objectContaining({ projectId: 'VCS-1500-AMZ-001', tonnes: 10000000 }),
    );
    expect(prisma.bridgeRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creditId: 5,
          sourceRegistry: 'VERRA',
          status: 'INBOUND',
          bridgerId: user.id,
          txHash: 'tx-bridge-in',
        }),
      }),
    );
    expect(record.creditId).toBe(5);
  });

  it('rejects a bridge in when the merkle proof does not verify', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    stellar.verifyProof.mockResolvedValue(false);

    await expect(
      service.bridgeIn(user.id, user.stellarPub, bridgeInDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stellar.bridgeIn).not.toHaveBeenCalled();
  });

  it('rejects a bridge in for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.bridgeIn('missing', 'GWALLET', bridgeInDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bridges a credit out and marks the record OUTBOUND', async () => {
    prisma.credit.findUnique.mockResolvedValue({
      id: 'credit-db-1',
      creditId: 5,
      ownerId: user.id,
    });
    prisma.bridgeRecord.findFirst.mockResolvedValue(bridgeRecord);
    stellar.bridgeOut.mockResolvedValue('tx-bridge-out');
    prisma.bridgeRecord.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...bridgeRecord, ...data }),
    );

    const record = await service.bridgeOut(user.id, user.stellarPub, 5);

    expect(stellar.bridgeOut).toHaveBeenCalledWith(user.stellarPub, 5);
    expect(prisma.bridgeRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bridge-1' },
        data: { status: 'OUTBOUND', txHash: 'tx-bridge-out' },
      }),
    );
    expect(record.status).toBe('OUTBOUND');
  });

  it('forbids bridging out a credit that is not owned by the caller', async () => {
    prisma.credit.findUnique.mockResolvedValue({
      id: 'credit-db-1',
      creditId: 5,
      ownerId: 'someone-else',
    });

    await expect(
      service.bridgeOut(user.id, user.stellarPub, 5),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects bridging out a native (non-bridged) credit', async () => {
    prisma.credit.findUnique.mockResolvedValue({
      id: 'credit-db-1',
      creditId: 5,
      ownerId: user.id,
    });
    prisma.bridgeRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.bridgeOut(user.id, user.stellarPub, 5),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a double bridge-out of an already OUTBOUND credit', async () => {
    prisma.credit.findUnique.mockResolvedValue({
      id: 'credit-db-1',
      creditId: 5,
      ownerId: user.id,
    });
    prisma.bridgeRecord.findFirst.mockResolvedValue({
      ...bridgeRecord,
      status: 'OUTBOUND',
    });

    await expect(
      service.bridgeOut(user.id, user.stellarPub, 5),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('paginates the bridge ledger with optional registry and status filters', async () => {
    prisma.bridgeRecord.findMany.mockResolvedValue([bridgeRecord]);
    prisma.bridgeRecord.count.mockResolvedValue(1);

    const result = await service.getRecords({ registry: 'verra', status: 'INBOUND', page: 2, limit: 10 });

    expect(prisma.bridgeRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sourceRegistry: 'VERRA', status: 'INBOUND' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result.meta).toEqual({ total: 1, page: 2, limit: 10, totalPages: 1 });
  });

  it('returns the published root for a registry', async () => {
    stellar.getRegistryRoot.mockResolvedValue({
      registry: 'VERRA',
      root: 'ef'.repeat(32),
      blockHeight: 24150000,
      updatedAt: 1780000000000,
    });

    const root = await service.getRegistryRoot('verra');

    expect(stellar.getRegistryRoot).toHaveBeenCalledWith('VERRA');
    expect(root.registry).toBe('VERRA');
    expect(root.root).toBe('ef'.repeat(32));
  });

  it('throws 404 when no root is published for a registry', async () => {
    stellar.getRegistryRoot.mockResolvedValue(null);

    await expect(service.getRegistryRoot('VERRA')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('publishes a new registry root as admin and returns the tx', async () => {
    stellar.updateRegistryRoot.mockResolvedValue('tx-root');

    const result = await service.updateRegistryRoot(
      user.stellarPub,
      'GOLD_STANDARD',
      { root: 'ab'.repeat(32), blockHeight: 90000000 } as never,
    );

    expect(stellar.updateRegistryRoot).toHaveBeenCalledWith(
      user.stellarPub,
      'GOLD_STANDARD',
      'ab'.repeat(32),
      90000000,
    );
    expect(result).toEqual({
      registry: 'GOLD_STANDARD',
      blockHeight: 90000000,
      txHash: 'tx-root',
    });
  });
});

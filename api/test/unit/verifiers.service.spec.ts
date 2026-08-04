import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VerifiersService } from '../../src/verifiers/verifiers.service';
import { createPrismaMock, createStellarMock, createEventsMock } from './service-mocks';

describe('VerifiersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let events: ReturnType<typeof createEventsMock>;
  let service: VerifiersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    events = createEventsMock();
    service = new VerifiersService(prisma as never, stellar as never, events as never);
  });

  it('registers a verifier after staking on-chain', async () => {
    prisma.verifier.findFirst.mockResolvedValue(null);
    stellar.registerVerifier.mockResolvedValue(true);
    prisma.verifier.create.mockResolvedValue({ id: 'verifier-1', stake: 50000, status: 'ACTIVE' });

    await expect(service.register('user-1', 'GVERIFIER', { stake: 50000 })).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('prevents duplicate verifier registration', async () => {
    prisma.verifier.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.register('user-1', 'GVERIFIER', { stake: 50000 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns verifier profile with approval totals', async () => {
    prisma.verifier.findUnique.mockResolvedValue({ id: 'verifier-1', userId: 'user-1' });
    prisma.approval.aggregate.mockResolvedValue({ _count: 3 });

    await expect(service.findOne('verifier-1')).resolves.toMatchObject({ totalApprovals: 3 });
  });

  it('updates heartbeat for existing verifiers', async () => {
    prisma.verifier.findUnique.mockResolvedValue({ id: 'verifier-1' });
    prisma.verifier.update.mockResolvedValue({ id: 'verifier-1', heartbeatAt: new Date('2026-06-16T00:00:00Z') });

    await expect(service.heartbeat('verifier-1')).resolves.toMatchObject({ id: 'verifier-1' });
  });

  it('throws for missing verifier heartbeat', async () => {
    prisma.verifier.findUnique.mockResolvedValue(null);

    await expect(service.heartbeat('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

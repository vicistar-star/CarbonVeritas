import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetirementService } from '../../src/retirement/retirement.service';
import { createPrismaMock, createStellarMock } from './service-mocks';

describe('RetirementService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let service: RetirementService;

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    service = new RetirementService(prisma as never, stellar as never);
  });

  it('retires an active owned credit and marks it retired when fully consumed', async () => {
    prisma.credit.findUnique.mockResolvedValue({ id: 'credit-db-1', creditId: 5, ownerId: 'user-1', status: 'ACTIVE', tonnes: 10, projectId: 'P-1' });
    stellar.isRetired.mockResolvedValue(false);
    stellar.retire.mockResolvedValue({ txHash: 'tx-retire', ledgerSequence: 123 });
    prisma.retirement.create.mockResolvedValue({ id: 'retirement-1', tonnesRetired: 10 });
    prisma.credit.update.mockResolvedValue({});

    const result = await service.retireCredit('user-1', 'GUSER', 5, {
      beneficiary: 'Acme',
      reason: 'FY offset',
      accountingPeriod: '2026-06',
    });

    expect(stellar.retire).toHaveBeenCalledWith('GUSER', 5, 'FY offset', 'Acme', '2026-06');
    expect(prisma.credit.update).toHaveBeenCalledWith({ where: { creditId: 5 }, data: { status: 'RETIRED' } });
    expect(result.credit).toEqual({ creditId: 5, projectId: 'P-1' });
  });

  it('rejects retirement of a credit owned by someone else', async () => {
    prisma.credit.findUnique.mockResolvedValue({ ownerId: 'other-user', status: 'ACTIVE' });

    await expect(service.retireCredit('user-1', 'GUSER', 5, {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects already retired on-chain credits', async () => {
    prisma.credit.findUnique.mockResolvedValue({ ownerId: 'user-1', status: 'ACTIVE', tonnes: 10 });
    stellar.isRetired.mockResolvedValue(true);

    await expect(service.retireCredit('user-1', 'GUSER', 5, {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns certificate data for retired credits', async () => {
    prisma.credit.findUnique.mockResolvedValue({
      creditId: 5,
      status: 'RETIRED',
      projectId: 'P-1',
      methodology: 'VCS',
      geography: 'BR',
      vintageStart: new Date('2024-01-01'),
      vintageEnd: new Date('2024-12-31'),
      tonnes: 10,
      retirements: [{ id: 'r-1', beneficiary: 'Acme', reason: 'Offset', accountingPeriod: '2026-06', tonnesRetired: 10, txHash: 'tx', ledgerSequence: 1, timestamp: new Date(), certificateHash: 'hash' }],
    });

    const certificate = await service.getCertificate(5);

    expect(certificate.credit.creditId).toBe(5);
    expect(certificate.retirements).toHaveLength(1);
  });

  it('throws for missing certificate credits', async () => {
    prisma.credit.findUnique.mockResolvedValue(null);

    await expect(service.getCertificate(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});

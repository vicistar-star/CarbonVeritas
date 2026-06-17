import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificatesService } from '../../src/certificates/certificates.service';
import { createPrismaMock, createStellarMock } from './service-mocks';

describe('CertificatesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let service: CertificatesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    service = new CertificatesService(prisma as never, stellar as never, {} as never);
  });

  it('verifies a certificate against the on-chain retirement hash', async () => {
    prisma.certificate.findFirst.mockResolvedValue({ id: 'cert-1', certificateHash: 'hash-1', createdAt: new Date(), user: { stellarPub: 'GOWNER' } });
    prisma.retirement.findFirst.mockResolvedValue({ beneficiary: 'Acme', tonnesRetired: 10, timestamp: new Date(), txHash: 'tx', credit: { creditId: 8, projectId: 'P-1', methodology: 'VCS' } });
    stellar.getCertificateHash.mockResolvedValue('hash-1');

    const result = await service.verify({ certificateHash: 'hash-1' });

    expect(result.valid).toBe(true);
    expect(result.retirement?.creditId).toBe(8);
  });

  it('reports missing certificates as invalid instead of throwing', async () => {
    prisma.certificate.findFirst.mockResolvedValue(null);

    await expect(service.verify({ certificateHash: 'missing' })).resolves.toMatchObject({ valid: false });
  });

  it('gets certificate details with matching retirement data', async () => {
    prisma.certificate.findUnique.mockResolvedValue({ id: 'cert-1', certificateHash: 'hash-1', txHash: 'tx', metadata: {}, pdfUrl: null, createdAt: new Date(), user: { stellarPub: 'GOWNER' } });
    prisma.retirement.findFirst.mockResolvedValue({ beneficiary: 'Acme', reason: 'Offset', tonnesRetired: 10, timestamp: new Date(), txHash: 'tx', credit: { creditId: 8 } });

    await expect(service.getCertificate('cert-1')).resolves.toMatchObject({ id: 'cert-1', owner: 'GOWNER' });
  });

  it('creates certificates only for eligible retired credits', async () => {
    const retirement = { id: 'retire-1', beneficiary: 'Acme', reason: 'Offset', accountingPeriod: '2026-06', tonnesRetired: 10, timestamp: new Date('2026-06-16T00:00:00Z'), txHash: 'tx' };
    prisma.credit.findMany.mockResolvedValue([{ id: 'credit-db-1', creditId: 8, projectId: 'P-1', methodology: 'VCS', geography: 'BR', vintageStart: new Date(), vintageEnd: new Date(), tonnes: 10, serialPrefix: 'P-1-VCS-', retirements: [retirement] }]);
    prisma.certificate.findFirst.mockResolvedValue(null);
    prisma.certificate.create.mockResolvedValue({ id: 'cert-1', certificateHash: 'hash-1' });
    prisma.retirement.update.mockResolvedValue({});

    const result = await service.enqueueBatch('user-1', { creditIds: [8] });

    expect(result.generated).toBe(1);
    expect(prisma.retirement.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'retire-1' } }));
  });

  it('throws when no retired credits are eligible for batch certificates', async () => {
    prisma.credit.findMany.mockResolvedValue([]);

    await expect(service.enqueueBatch('user-1', { creditIds: [404] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws for missing certificate records', async () => {
    prisma.certificate.findUnique.mockResolvedValue(null);

    await expect(service.getCertificate('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

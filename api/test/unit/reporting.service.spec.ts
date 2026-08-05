import { ReportingService } from '../../src/reporting/reporting.service';
import { createPrismaMock } from './service-mocks';

describe('ReportingService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ReportingService;

  const baseRetirement = {
    id: 'r-1',
    beneficiary: 'NetZero Corp',
    reason: '2026 emissions offset',
    accountingPeriod: '2026-Q1',
    tonnesRetired: 100,
    txHash: '0xtx1',
    ledgerSequence: 42,
    timestamp: new Date('2026-06-01T00:00:00.000Z'),
    certificateHash: 'cert-1',
    credit: {
      creditId: 7,
      projectId: 'P-001',
      methodology: 'VCS:VM0007',
      geography: 'BR',
      vintageStart: new Date('2024-01-01T00:00:00.000Z'),
      vintageEnd: new Date('2024-12-31T00:00:00.000Z'),
      serialPrefix: 'VCS-',
      tonnes: 500,
      sdgFlags: 3,
    },
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ReportingService(prisma as never);
  });

  it('aggregates retirements into a scope 3 report summary', async () => {
    prisma.retirement.findMany.mockResolvedValue([
      baseRetirement,
      {
        ...baseRetirement,
        id: 'r-2',
        tonnesRetired: 50,
        credit: {
          ...baseRetirement.credit,
          creditId: 8,
          methodology: 'GS:VM0012',
          geography: 'ID',
          vintageStart: new Date('2025-01-01T00:00:00.000Z'),
        },
      },
    ]);

    const report = await service.getScope3Report('user-1', 'GWALLET');

    expect(prisma.retirement.findMany).toHaveBeenCalledWith({
      where: { retiredById: 'user-1' },
      orderBy: { timestamp: 'desc' },
      include: {
        credit: { select: expect.any(Object) },
      },
    });

    expect(report.reportType).toBe('scope3');
    expect(report.account.wallet).toBe('GWALLET');
    expect(report.summary.totalTonnesRetired).toBe(150);
    expect(report.summary.totalRetirements).toBe(2);
    expect(report.summary.totalCredits).toBe(2);
    expect(report.summary.byMethodology).toHaveLength(2);
    expect(report.summary.byGeography).toHaveLength(2);
    expect(report.summary.byVintage[0]).toEqual({
      vintage: 2024,
      tonnes: 100,
      retirements: 1,
    });
    expect(report.lineItems).toHaveLength(2);
    expect(report.lineItems[0].creditId).toBe(7);
    expect(report.lineItems[0].vintageStart).toBe('2024-01-01');
    expect(report.lineItems[0].retirementDate).toBe('2026-06-01T00:00:00.000Z');
  });

  it('filters retirements by calendar year when requested', async () => {
    prisma.retirement.findMany.mockResolvedValue([baseRetirement]);

    await service.getScope3Report('user-1', 'GWALLET', 2026);

    expect(prisma.retirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          retiredById: 'user-1',
          timestamp: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2027-01-01T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('handles an empty portfolio', async () => {
    prisma.retirement.findMany.mockResolvedValue([]);

    const report = await service.getScope3Report('user-1', 'GWALLET');

    expect(report.summary.totalTonnesRetired).toBe(0);
    expect(report.summary.totalRetirements).toBe(0);
    expect(report.summary.totalCredits).toBe(0);
    expect(report.summary.byMethodology).toEqual([]);
    expect(report.summary.byGeography).toEqual([]);
    expect(report.summary.byVintage).toEqual([]);
    expect(report.lineItems).toEqual([]);
  });

  it('renders a CSV with headers, one row per retirement and a BOM', async () => {
    prisma.retirement.findMany.mockResolvedValue([
      baseRetirement,
      {
        ...baseRetirement,
        id: 'r-2',
        beneficiary: 'Comma, Inc',
        reason: 'Offset "with quotes"',
        tonnesRetired: 50,
        credit: { ...baseRetirement.credit, creditId: 8 },
      },
    ]);

    const report = await service.getScope3Report('user-1', 'GWALLET');
    const csv = service.toScope3Csv(report);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.replace('\uFEFF', '').trim().split('\n');
    expect(lines[0]).toBe(
      'credit_id,project_id,methodology,geography,vintage_start,vintage_end,serial_prefix,tonnes_retired,beneficiary,reason,accounting_period,retirement_date,tx_hash,ledger_sequence,certificate_hash',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('7');
    expect(lines[1]).toContain('NetZero Corp');
    expect(lines[2]).toContain('"Comma, Inc"');
    expect(lines[2]).toContain('"Offset ""with quotes"""');
  });
});

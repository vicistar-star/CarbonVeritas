import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RevenueSplitService } from '../../src/revenue-split/revenue-split.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { createStellarMock } from './service-mocks';

describe('RevenueSplitService', () => {
  let service: RevenueSplitService;
  let stellar: ReturnType<typeof createStellarMock>;

  const beneficiaries = [
    { address: 'GBENEFICIARY1', bps: 6000 },
    { address: 'GBENEFICIARY2', bps: 4000 },
  ];

  beforeEach(async () => {
    stellar = createStellarMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RevenueSplitService,
        { provide: StellarService, useValue: stellar },
      ],
    }).compile();

    service = moduleRef.get(RevenueSplitService);
  });

  it('configures a revenue split and returns the tx hash', async () => {
    stellar.configureRevenueSplit.mockResolvedValue('tx-configure');

    const result = await service.configure('GADMIN', 'P-001', {
      beneficiaries,
    });

    expect(stellar.configureRevenueSplit).toHaveBeenCalledWith(
      'GADMIN',
      'P-001',
      beneficiaries,
    );
    expect(result).toEqual({ projectId: 'P-001', txHash: 'tx-configure' });
  });

  it('rejects configs whose bps shares do not sum to 10000', async () => {
    await expect(
      service.configure('GADMIN', 'P-001', {
        beneficiaries: [
          { address: 'GBEN1', bps: 6000 },
          { address: 'GBEN2', bps: 3000 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stellar.configureRevenueSplit).not.toHaveBeenCalled();
  });

  it('distributes a payment and returns the tx hash', async () => {
    stellar.distributeRevenueSplit.mockResolvedValue('tx-distribute');

    const result = await service.distribute('GPAYER', 'P-001', {
      asset: 'GUSDC',
      amount: 1000000000,
    });

    expect(stellar.distributeRevenueSplit).toHaveBeenCalledWith(
      'GPAYER',
      'P-001',
      'GUSDC',
      1000000000,
    );
    expect(result).toEqual({
      projectId: 'P-001',
      asset: 'GUSDC',
      amount: 1000000000,
      txHash: 'tx-distribute',
    });
  });

  it('returns a projects revenue config', async () => {
    stellar.getRevenueConfig.mockResolvedValue({
      projectId: 'P-001',
      beneficiaries,
      protocolFeeBps: 50,
    });

    const result = await service.getConfig('P-001');

    expect(stellar.getRevenueConfig).toHaveBeenCalledWith('P-001');
    expect(result).toMatchObject({ projectId: 'P-001', protocolFeeBps: 50 });
  });

  it('throws a 404 when no config exists for the project', async () => {
    stellar.getRevenueConfig.mockResolvedValue(null);

    await expect(service.getConfig('P-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

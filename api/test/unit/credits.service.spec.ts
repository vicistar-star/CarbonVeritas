import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreditsService } from '../../src/credits/credits.service';
import { createPrismaMock, createStellarMock } from './service-mocks';

describe('CreditsService', () => {
  const user = { id: 'user-1', stellarPub: 'GUSER' };
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let ipfs: { pinJson: jest.Mock };
  let service: CreditsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    ipfs = { pinJson: jest.fn() };
    service = new CreditsService(prisma as never, stellar as never, ipfs as never);
    process.env.VERIFIER_THRESHOLD = '1';
  });

  it('issues a credit by pinning metadata, submitting on-chain, and storing a pending record', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.credit.findFirst.mockResolvedValue(null);
    ipfs.pinJson.mockResolvedValue({ ipfsHash: 'bafy123' });
    stellar.submitCredit.mockResolvedValue('tx-1');
    prisma.credit.create.mockImplementation(({ data }) => Promise.resolve({ id: 'credit-db-1', ...data }));

    const credit = await service.issueCredit(user.id, user.stellarPub, {
      projectId: 'AMZ-001',
      methodology: 'VCS:VM0007',
      vintageStart: '2024-01-01',
      vintageEnd: '2024-12-31',
      tonnes: 250,
      geography: 'BR',
      sdgCobenefits: [7, 13],
    } as never);

    expect(ipfs.pinJson).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'AMZ-001' }));
    expect(stellar.submitCredit).toHaveBeenCalledWith(
      user.stellarPub,
      expect.objectContaining({
        projectId: 'AMZ-001',
        methodology: 'VCS:VM0007',
        tonnes: 250,
        geography: 'BR',
        ipfsHash: 'bafy123',
      }),
      'bafy123',
    );
    expect(prisma.credit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ creditId: 1, status: 'PENDING', issuerId: user.id }),
    }));
    expect(credit.serialPrefix).toBe('AMZ-001-VCSVM0-');
  });

  it('rejects issue requests for missing users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.issueCredit('missing', 'GWALLET', {} as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('activates a pending credit after verifier approval reaches threshold', async () => {
    prisma.verifier.findFirst.mockResolvedValue({ id: 'verifier-1', status: 'ACTIVE' });
    prisma.credit.findUnique
      .mockResolvedValueOnce({ id: 'credit-db-1', creditId: 42, status: 'PENDING', approvals: [] })
      .mockResolvedValueOnce({ creditId: 42, status: 'ACTIVE' });
    stellar.approveAndMint.mockResolvedValue('mint-tx');
    prisma.approval.create.mockResolvedValue({});
    prisma.approval.count.mockResolvedValue(1);
    prisma.credit.update.mockResolvedValue({});

    const result = await service.approveCredit('verifier-user', 'GVERIFIER', 42, { comments: 'looks good' });

    expect(stellar.approveAndMint).toHaveBeenCalledWith('GVERIFIER', 42, 'looks good');
    expect(prisma.credit.update).toHaveBeenCalledWith({
      where: { creditId: 42 },
      data: { status: 'ACTIVE', tokenId: 'mint-tx' },
    });
    expect(result).toEqual({ creditId: 42, status: 'ACTIVE' });
  });

  it('blocks duplicate approvals by the same verifier', async () => {
    prisma.verifier.findFirst.mockResolvedValue({ id: 'verifier-1', status: 'ACTIVE' });
    prisma.credit.findUnique.mockResolvedValue({
      id: 'credit-db-1',
      creditId: 42,
      status: 'PENDING',
      approvals: [{ verifierId: 'verifier-user', approved: true }],
    });

    await expect(
      service.approveCredit('verifier-user', 'GVERIFIER', 42, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an active verifier before approving', async () => {
    prisma.verifier.findFirst.mockResolvedValue(null);

    await expect(service.approveCredit('user-1', 'GUSER', 1, {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('builds filtered credit queries and pagination metadata', async () => {
    prisma.credit.findMany.mockResolvedValue([{ creditId: 1 }]);
    prisma.credit.count.mockResolvedValue(1);

    const result = await service.getCredits({
      page: 2,
      limit: 5,
      methodology: 'vcs',
      geography: 'br',
      vintageMin: 2020,
      vintageMax: 2024,
      status: 'active',
      sort: 'vintage_asc',
    } as never);

    expect(prisma.credit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 5,
      take: 5,
      orderBy: { vintageStart: 'asc' },
      where: expect.objectContaining({
        methodology: { contains: 'vcs', mode: 'insensitive' },
        geography: 'BR',
        status: 'ACTIVE',
      }),
    }));
    expect(result.meta).toEqual({ total: 1, page: 2, limit: 5, totalPages: 1 });
  });
});

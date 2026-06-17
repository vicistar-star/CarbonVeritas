import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarketplaceService } from '../../src/marketplace/marketplace.service';
import { createPrismaMock, createStellarMock } from './service-mocks';

describe('MarketplaceService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let stellar: ReturnType<typeof createStellarMock>;
  let service: MarketplaceService;

  beforeEach(() => {
    prisma = createPrismaMock();
    stellar = createStellarMock();
    service = new MarketplaceService(prisma as never, stellar as never);
  });

  it('creates an offer for an active owned credit', async () => {
    prisma.credit.findUnique.mockResolvedValue({ id: 'credit-db-1', creditId: 7, ownerId: 'seller-1', status: 'ACTIVE' });
    prisma.offer.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ offerId: 8 });
    stellar.createOffer.mockResolvedValue(9);
    prisma.offer.create.mockImplementation(({ data }) => Promise.resolve({ ...data, offerId: 9 }));

    const offer = await service.createOffer('seller-1', 'GSELLER', {
      creditId: 7,
      pricePerTonne: 12,
      amount: 50,
      currency: 'USDC',
    } as never);

    expect(stellar.createOffer).toHaveBeenCalledWith('GSELLER', 7, 12, 50, 'USDC', null);
    expect(offer.offerId).toBe(9);
  });

  it('rejects offers for credits the seller does not own', async () => {
    prisma.credit.findUnique.mockResolvedValue({ id: 'credit-db-1', ownerId: 'other-user', status: 'ACTIVE' });

    await expect(service.createOffer('seller-1', 'GSELLER', { creditId: 7 } as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('buys credits, records a trade, transfers ownership, and fills the offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'offer-db-1',
      offerId: 12,
      sellerId: 'seller-1',
      status: 'ACTIVE',
      amount: 25,
      amountFilled: 5,
      pricePerTonne: 10,
      credit: { id: 'credit-db-1', creditId: 7 },
    });
    stellar.buyCredits.mockResolvedValue(true);
    stellar.transferCredit.mockResolvedValue(true);
    prisma.trade.create.mockResolvedValue({ id: 'trade-1', totalPrice: 100 });
    prisma.credit.update.mockResolvedValue({});
    prisma.offer.update.mockResolvedValue({});

    const trade = await service.buyCredits('buyer-1', 'GBUYER', 12, 10);

    expect(stellar.buyCredits).toHaveBeenCalledWith('GBUYER', 12, 10);
    expect(prisma.trade.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ buyerId: 'buyer-1', amount: 10, totalPrice: 100 }),
    }));
    expect(prisma.offer.update).toHaveBeenCalledWith({
      where: { offerId: 12 },
      data: { amountFilled: 15, status: 'ACTIVE' },
    });
    expect(trade.id).toBe('trade-1');
  });

  it('expires stale offers before allowing purchase', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      offerId: 12,
      sellerId: 'seller-1',
      status: 'ACTIVE',
      amount: 25,
      amountFilled: 0,
      expiresAt: new Date(Date.now() - 1000),
      credit: { id: 'credit-db-1', creditId: 7 },
    });
    prisma.offer.update.mockResolvedValue({});

    await expect(service.buyCredits('buyer-1', 'GBUYER', 12, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.offer.update).toHaveBeenCalledWith({ where: { offerId: 12 }, data: { status: 'EXPIRED' } });
  });

  it('cancels only active offers owned by the caller', async () => {
    prisma.offer.findUnique.mockResolvedValue({ offerId: 3, sellerId: 'seller-1', status: 'ACTIVE' });
    stellar.cancelOffer.mockResolvedValue(true);
    prisma.offer.update.mockResolvedValue({ offerId: 3, status: 'CANCELLED' });

    await expect(service.cancelOffer('seller-1', 3)).resolves.toEqual({ offerId: 3, status: 'CANCELLED' });
  });

  it('throws when cancelling a missing offer', async () => {
    prisma.offer.findUnique.mockResolvedValue(null);

    await expect(service.cancelOffer('seller-1', 404)).rejects.toBeInstanceOf(NotFoundException);
  });
});

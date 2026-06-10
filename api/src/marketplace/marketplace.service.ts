import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { MarketplaceFilterDto } from './dto/marketplace-filter.dto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
  ) {}

  async createOffer(userId: string, wallet: string, dto: CreateOfferDto) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId: dto.creditId },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    if (credit.ownerId !== userId) {
      throw new ForbiddenException('You do not own this credit');
    }

    if (credit.status !== 'ACTIVE') {
      throw new BadRequestException('Credit is not ACTIVE');
    }

    const existingOffer = await this.prisma.offer.findFirst({
      where: { creditId: credit.id, sellerId: userId, status: 'ACTIVE' },
    });

    if (existingOffer) {
      throw new BadRequestException('You already have an active offer for this credit');
    }

    const lastOffer = await this.prisma.offer.findFirst({
      orderBy: { offerId: 'desc' },
      select: { offerId: true },
    });
    const offerId = (lastOffer?.offerId ?? 0) + 1;

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('Expiry must be in the future');
    }

    const onChainOfferId = await this.stellar.createOffer(
      wallet,
      dto.creditId,
      dto.pricePerTonne,
      dto.amount,
      dto.currency,
      expiresAt ? expiresAt.getTime() : null,
    );

    const offer = await this.prisma.offer.create({
      data: {
        offerId,
        creditId: credit.id,
        sellerId: userId,
        pricePerTonne: dto.pricePerTonne,
        amount: dto.amount,
        currency: dto.currency,
        expiresAt,
      },
      include: {
        credit: { select: { creditId: true, projectId: true, methodology: true } },
        seller: { select: { id: true, stellarPub: true } },
      },
    });

    this.logger.log(`Offer created: id=${offerId}, creditId=${dto.creditId}, onChainId=${onChainOfferId}`);

    return offer;
  }

  async buyCredits(userId: string, wallet: string, offerId: number, amount: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { offerId },
      include: { credit: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'ACTIVE') {
      throw new BadRequestException('Offer is not active');
    }

    if (offer.sellerId === userId) {
      throw new BadRequestException('Cannot buy your own offer');
    }

    if (amount > offer.amount - offer.amountFilled) {
      throw new BadRequestException('Requested amount exceeds available tonnes');
    }

    if (offer.expiresAt && offer.expiresAt <= new Date()) {
      await this.prisma.offer.update({
        where: { offerId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Offer has expired');
    }

    const totalPrice = amount * offer.pricePerTonne;

    const success = await this.stellar.buyCredits(wallet, offerId, amount);

    if (!success) {
      throw new BadRequestException('On-chain transaction failed');
    }

    await this.stellar.transferCredit(wallet, offer.sellerId, offer.credit.creditId);

    const [trade] = await Promise.all([
      this.prisma.trade.create({
        data: {
          offerId: offer.id,
          buyerId: userId,
          amount,
          totalPrice,
          creditId: offer.credit.id,
        },
      }),
      this.prisma.credit.update({
        where: { id: offer.credit.id },
        data: { ownerId: userId },
      }),
    ]);

    const newFilled = offer.amountFilled + amount;
    const isFilled = newFilled >= offer.amount;

    await this.prisma.offer.update({
      where: { offerId },
      data: {
        amountFilled: newFilled,
        status: isFilled ? 'FILLED' : 'ACTIVE',
      },
    });

    this.logger.log(`Buy: offerId=${offerId}, buyer=${wallet}, amount=${amount}, total=${totalPrice}`);

    return trade;
  }

  async cancelOffer(userId: string, offerId: number) {
    const offer = await this.prisma.offer.findUnique({ where: { offerId } });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.sellerId !== userId) {
      throw new ForbiddenException('You can only cancel your own offers');
    }

    if (offer.status !== 'ACTIVE') {
      throw new BadRequestException('Offer is not active');
    }

    await this.stellar.cancelOffer(userId, offerId);

    const cancelled = await this.prisma.offer.update({
      where: { offerId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Offer cancelled: offerId=${offerId}`);
    return cancelled;
  }

  async getListings(filters: MarketplaceFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: filters.status ?? 'ACTIVE',
    };

    if (filters.methodology || filters.geography || filters.maxPrice) {
      where.credit = {};

      if (filters.methodology) {
        (where.credit as Record<string, unknown>).methodology = {
          contains: filters.methodology,
          mode: 'insensitive',
        };
      }

      if (filters.geography) {
        (where.credit as Record<string, unknown>).geography = filters.geography.toUpperCase();
      }

      if (filters.maxPrice) {
        where.pricePerTonne = { lte: filters.maxPrice };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          credit: {
            select: {
              creditId: true,
              projectId: true,
              methodology: true,
              geography: true,
              vintageStart: true,
              vintageEnd: true,
              tonnes: true,
              status: true,
            },
          },
          seller: { select: { id: true, stellarPub: true } },
          _count: { select: { trades: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTradeHistory(userId: string) {
    const trades = await this.prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { offer: { sellerId: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        credit: {
          select: { creditId: true, projectId: true, methodology: true, geography: true },
        },
        offer: {
          select: { offerId: true, pricePerTonne: true, seller: { select: { stellarPub: true } } },
        },
      },
    });

    return trades;
  }

  async getPriceHistory() {
    const trades = await this.prisma.trade.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        totalPrice: true,
        amount: true,
        createdAt: true,
      },
    });

    const buckets: Record<string, { volume: number; sum: number; count: number }> = {};

    for (const trade of trades) {
      const day = trade.createdAt.toISOString().slice(0, 10);
      if (!buckets[day]) {
        buckets[day] = { volume: 0, sum: 0, count: 0 };
      }
      buckets[day].volume += trade.amount;
      buckets[day].sum += trade.totalPrice;
      buckets[day].count += 1;
    }

    return Object.entries(buckets)
      .map(([date, b]) => ({
        date,
        volume: b.volume,
        vwap: b.sum / b.volume,
        tradeCount: b.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getStats() {
    const [activeOffers, totalVolumeAgg, lastTrades] = await Promise.all([
      this.prisma.offer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trade.aggregate({
        _sum: { amount: true, totalPrice: true },
      }),
      this.prisma.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { totalPrice: true, amount: true, createdAt: true },
      }),
    ]);

    const totalVolume = totalVolumeAgg._sum.amount ?? 0;
    const totalValue = totalVolumeAgg._sum.totalPrice ?? 0;

    return {
      activeOffers,
      totalVolume,
      vwap: totalVolume > 0 ? totalValue / totalVolume : 0,
      recentTrades: lastTrades,
    };
  }
}

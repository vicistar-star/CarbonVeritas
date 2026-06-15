import { PrismaClient } from '@prisma/client';

export interface OfferCreatedEvent {
  offerId: number;
  seller: string;
  creditId: number;
  pricePerTonne: number;
  amount: number;
  currency: string;
  expiresAt?: number;
  timestamp: number;
  txHash: string;
}

export async function processOfferCreated(
  prisma: PrismaClient,
  event: OfferCreatedEvent,
): Promise<void> {
  const seller = await prisma.user.upsert({
    where: { stellarPub: event.seller },
    update: {},
    create: { stellarPub: event.seller },
  });

  const credit = await prisma.credit.findUnique({
    where: { creditId: event.creditId },
  });
  if (!credit) return;

  await prisma.offer.upsert({
    where: { offerId: event.offerId },
    update: {
      pricePerTonne: event.pricePerTonne,
      amount: event.amount,
      currency: event.currency,
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      status: 'ACTIVE',
    },
    create: {
      offerId: event.offerId,
      creditId: credit.id,
      sellerId: seller.id,
      pricePerTonne: event.pricePerTonne,
      amount: event.amount,
      currency: event.currency,
      expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      status: 'ACTIVE',
    },
  });
}

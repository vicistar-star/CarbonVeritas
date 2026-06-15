import { PrismaClient, OfferStatus } from '@prisma/client';

export interface OfferFilledEvent {
  offerId: number;
  buyer: string;
  amount: number;
  totalPrice: number;
  timestamp: number;
  txHash: string;
}

export async function processOfferFilled(
  prisma: PrismaClient,
  event: OfferFilledEvent,
): Promise<void> {
  const offer = await prisma.offer.findUnique({
    where: { offerId: event.offerId },
    include: { credit: true },
  });
  if (!offer) return;

  const buyer = await prisma.user.upsert({
    where: { stellarPub: event.buyer },
    update: {},
    create: { stellarPub: event.buyer },
  });

  const newFilled = offer.amountFilled + event.amount;
  const isFullyFilled = newFilled >= offer.amount;

  await prisma.offer.update({
    where: { offerId: event.offerId },
    data: {
      amountFilled: newFilled,
      status: isFullyFilled ? OfferStatus.FILLED : undefined,
    },
  });

  await prisma.trade.create({
    data: {
      offerId: offer.id,
      buyerId: buyer.id,
      amount: event.amount,
      totalPrice: event.totalPrice,
      creditId: offer.creditId,
    },
  });

  await prisma.credit.update({
    where: { id: offer.creditId },
    data: { ownerId: buyer.id },
  });
}

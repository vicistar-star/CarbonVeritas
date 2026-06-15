import { PrismaClient, OfferStatus } from '@prisma/client';

export interface OfferCancelledEvent {
  offerId: number;
  timestamp: number;
  txHash: string;
}

export async function processOfferCancelled(
  prisma: PrismaClient,
  event: OfferCancelledEvent,
): Promise<void> {
  await prisma.offer.update({
    where: { offerId: event.offerId },
    data: { status: OfferStatus.CANCELLED },
  });
}

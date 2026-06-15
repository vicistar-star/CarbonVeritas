import { PrismaClient } from '@prisma/client';

export interface CreditTransferredEvent {
  creditId: number;
  from: string;
  to: string;
  timestamp: number;
  txHash: string;
}

export async function processCreditTransferred(
  prisma: PrismaClient,
  event: CreditTransferredEvent,
): Promise<void> {
  const newOwner = await prisma.user.upsert({
    where: { stellarPub: event.to },
    update: {},
    create: { stellarPub: event.to },
  });

  await prisma.credit.update({
    where: { creditId: event.creditId },
    data: { ownerId: newOwner.id },
  });
}

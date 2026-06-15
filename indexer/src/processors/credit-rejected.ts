import { PrismaClient, CreditStatus } from '@prisma/client';

export interface CreditRejectedEvent {
  creditId: number;
  verifier: string;
  reason: string;
  timestamp: number;
  txHash: string;
}

export async function processCreditRejected(
  prisma: PrismaClient,
  event: CreditRejectedEvent,
): Promise<void> {
  const credit = await prisma.credit.findUnique({
    where: { creditId: event.creditId },
  });
  if (!credit) return;

  const verifier = await prisma.user.upsert({
    where: { stellarPub: event.verifier },
    update: {},
    create: { stellarPub: event.verifier },
  });

  await prisma.approval.create({
    data: {
      creditId: credit.id,
      verifierId: verifier.id,
      approved: false,
      comments: event.reason,
    },
  });

  await prisma.credit.update({
    where: { creditId: event.creditId },
    data: { status: CreditStatus.REJECTED },
  });
}

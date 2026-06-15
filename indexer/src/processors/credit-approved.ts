import { PrismaClient } from '@prisma/client';

export interface CreditApprovedEvent {
  creditId: number;
  verifier: string;
  approved: boolean;
  comments?: string;
  timestamp: number;
  txHash: string;
}

export async function processCreditApproved(
  prisma: PrismaClient,
  event: CreditApprovedEvent,
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
      approved: event.approved,
      comments: event.comments ?? null,
    },
  });
}

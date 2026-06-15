import { PrismaClient, CreditStatus } from '@prisma/client';

export interface CreditRetiredEvent {
  creditId: number;
  retiredBy: string;
  beneficiary: string;
  reason: string;
  accountingPeriod: string;
  tonnesRetired: number;
  txHash: string;
  ledgerSequence: number;
  timestamp: number;
}

export async function processCreditRetired(
  prisma: PrismaClient,
  event: CreditRetiredEvent,
): Promise<void> {
  const credit = await prisma.credit.findUnique({
    where: { creditId: event.creditId },
  });
  if (!credit) return;

  const retirer = await prisma.user.upsert({
    where: { stellarPub: event.retiredBy },
    update: {},
    create: { stellarPub: event.retiredBy },
  });

  await prisma.retirement.create({
    data: {
      creditId: credit.id,
      retiredById: retirer.id,
      beneficiary: event.beneficiary,
      reason: event.reason,
      accountingPeriod: event.accountingPeriod,
      tonnesRetired: event.tonnesRetired,
      txHash: event.txHash,
      ledgerSequence: event.ledgerSequence,
      timestamp: new Date(event.timestamp),
    },
  });

  await prisma.credit.update({
    where: { creditId: event.creditId },
    data: { status: CreditStatus.RETIRED },
  });
}

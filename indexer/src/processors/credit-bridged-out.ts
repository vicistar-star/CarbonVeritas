import { PrismaClient, BridgeStatus, CreditStatus } from '@prisma/client';

/**
 * On-chain confirmation that a bridged credit was returned to its source
 * registry. `bridge_out` permanently retires the on-chain credit to prevent
 * double-counting, so the processor marks the credit RETIRED and flips the
 * bridge ledger entry to OUTBOUND.
 */
export interface CreditBridgedOutEvent {
  creditId: number;
  owner: string;
  txHash: string;
  timestamp: number;
}

export async function processCreditBridgedOut(
  prisma: PrismaClient,
  event: CreditBridgedOutEvent,
): Promise<void> {
  await prisma.credit.update({
    where: { creditId: event.creditId },
    data: { status: CreditStatus.RETIRED },
  });

  const record = await prisma.bridgeRecord.findFirst({
    where: { creditId: event.creditId },
  });
  if (!record) return;

  await prisma.bridgeRecord.update({
    where: { id: record.id },
    data: {
      status: BridgeStatus.OUTBOUND,
      txHash: event.txHash || record.txHash,
    },
  });
}

import { PrismaClient, BridgeStatus } from '@prisma/client';

/**
 * On-chain confirmation that a credit was successfully bridged in from a
 * legacy registry. The MerkleBridge contract emits this only after
 * `mint_bridged` succeeded, so it is the authoritative confirmation that
 * the import settled.
 */
export interface CreditBridgedEvent {
  creditId: number;
  sourceRegistry: string;
  sourceSerial: string;
  txHash: string;
  timestamp: number;
}

export async function processCreditBridged(
  prisma: PrismaClient,
  event: CreditBridgedEvent,
): Promise<void> {
  const record = await prisma.bridgeRecord.findUnique({
    where: {
      sourceRegistry_sourceSerial: {
        sourceRegistry: event.sourceRegistry,
        sourceSerial: event.sourceSerial,
      },
    },
  });
  if (!record) {
    console.warn(
      `[Indexer] bridged event for ${event.sourceRegistry}/${event.sourceSerial} has no API record; import settled on-chain but was never attributed`,
    );
    return;
  }

  await prisma.bridgeRecord.update({
    where: { id: record.id },
    data: {
      status: BridgeStatus.INBOUND,
      txHash: event.txHash || record.txHash,
    },
  });
}

import { PrismaClient, CreditStatus } from '@prisma/client';

export interface CreditMintedEvent {
  creditId: number;
  tokenId: string;
  timestamp: number;
  txHash: string;
}

export async function processCreditMinted(
  prisma: PrismaClient,
  event: CreditMintedEvent,
): Promise<void> {
  await prisma.credit.update({
    where: { creditId: event.creditId },
    data: {
      status: CreditStatus.ACTIVE,
      tokenId: event.tokenId,
    },
  });
}

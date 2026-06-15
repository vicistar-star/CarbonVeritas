import { PrismaClient } from '@prisma/client';

export interface CreditSubmittedEvent {
  creditId: number;
  issuer: string;
  projectId: string;
  methodology: string;
  vintageStart: string;
  vintageEnd: string;
  tonnes: number;
  geography: string;
  serialPrefix: string;
  sdgFlags: number;
  permanenceRating: number;
  bufferContributionPct: number;
  additionalityType: number;
  ipfsHash: string;
  timestamp: number;
  txHash: string;
}

export async function processCreditSubmitted(
  prisma: PrismaClient,
  event: CreditSubmittedEvent,
): Promise<void> {
  const issuer = await prisma.user.upsert({
    where: { stellarPub: event.issuer },
    update: {},
    create: { stellarPub: event.issuer },
  });

  await prisma.credit.upsert({
    where: { creditId: event.creditId },
    update: {
      projectId: event.projectId,
      methodology: event.methodology,
      vintageStart: new Date(event.vintageStart),
      vintageEnd: new Date(event.vintageEnd),
      tonnes: event.tonnes,
      geography: event.geography,
      serialPrefix: event.serialPrefix,
      sdgFlags: event.sdgFlags,
      permanenceRating: event.permanenceRating,
      bufferContributionPct: event.bufferContributionPct,
      additionalityType: event.additionalityType,
      ipfsHash: event.ipfsHash,
      status: 'PENDING',
    },
    create: {
      creditId: event.creditId,
      projectId: event.projectId,
      methodology: event.methodology,
      vintageStart: new Date(event.vintageStart),
      vintageEnd: new Date(event.vintageEnd),
      tonnes: event.tonnes,
      geography: event.geography,
      serialPrefix: event.serialPrefix,
      sdgFlags: event.sdgFlags,
      permanenceRating: event.permanenceRating,
      bufferContributionPct: event.bufferContributionPct,
      additionalityType: event.additionalityType,
      ipfsHash: event.ipfsHash,
      status: 'PENDING',
      issuerId: issuer.id,
      ownerId: issuer.id,
    },
  });
}

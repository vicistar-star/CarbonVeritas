import { PrismaClient, CreditStatus, VerifierStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const admin = await prisma.user.upsert({
    where: { stellarPub: 'GADMIN12345678901234567890123456789012345678901234' },
    update: {},
    create: {
      stellarPub: 'GADMIN12345678901234567890123456789012345678901234',
    },
  });

  const verifierUsers = await Promise.all([
    prisma.user.upsert({
      where: { stellarPub: 'GVERIFIER1111111111111111111111111111111111111111' },
      update: {},
      create: { stellarPub: 'GVERIFIER1111111111111111111111111111111111111111' },
    }),
    prisma.user.upsert({
      where: { stellarPub: 'GVERIFIER2222222222222222222222222222222222222222' },
      update: {},
      create: { stellarPub: 'GVERIFIER2222222222222222222222222222222222222222' },
    }),
    prisma.user.upsert({
      where: { stellarPub: 'GVERIFIER3333333333333333333333333333333333333333' },
      update: {},
      create: { stellarPub: 'GVERIFIER3333333333333333333333333333333333333333' },
    }),
  ]);

  await prisma.verifier.deleteMany();

  const verifierRecords = await Promise.all([
    prisma.verifier.create({
      data: {
        userId: verifierUsers[0].id,
        status: VerifierStatus.ACTIVE,
        stake: 50000,
        reputation: 92,
      },
    }),
    prisma.verifier.create({
      data: {
        userId: verifierUsers[1].id,
        status: VerifierStatus.ACTIVE,
        stake: 75000,
        reputation: 88,
      },
    }),
    prisma.verifier.create({
      data: {
        userId: verifierUsers[2].id,
        status: VerifierStatus.ACTIVE,
        stake: 60000,
        reputation: 95,
      },
    }),
  ]);

  const issuerUser = await prisma.user.upsert({
    where: { stellarPub: 'GISSUER9999999999999999999999999999999999999999999' },
    update: {},
    create: { stellarPub: 'GISSUER9999999999999999999999999999999999999999999' },
  });

  const creditData = [
    {
      creditId: 1,
      projectId: 'AMZ-REF-001',
      methodology: 'VCS:VM0007',
      vintageStart: new Date('2021-01-01'),
      vintageEnd: new Date('2021-12-31'),
      tonnes: 10000,
      geography: 'BR',
      serialPrefix: 'AMZ-REF-VCS0007-',
      sdgFlags: 0b1000001001001,
      permanenceRating: 87,
      bufferContributionPct: 10,
      additionalityType: 1,
      ipfsHash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      status: CreditStatus.ACTIVE,
      tokenId: '0xabcdef1234567890',
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 2,
      projectId: 'KLM-REF-002',
      methodology: 'GS:AR-ACM0003',
      vintageStart: new Date('2022-06-01'),
      vintageEnd: new Date('2023-05-31'),
      tonnes: 25000,
      geography: 'KE',
      serialPrefix: 'KLM-REF-GSAC0003-',
      sdgFlags: 0b1000010010010,
      permanenceRating: 72,
      bufferContributionPct: 15,
      additionalityType: 0,
      ipfsHash: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      status: CreditStatus.PENDING,
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 3,
      projectId: 'BOR-MCP-001',
      methodology: 'CDM:ACM0010',
      vintageStart: new Date('2020-01-01'),
      vintageEnd: new Date('2024-12-31'),
      tonnes: 500000,
      geography: 'CN',
      serialPrefix: 'BOR-MCP-CDMACM-',
      sdgFlags: 0b0001000000001,
      permanenceRating: 45,
      bufferContributionPct: 20,
      additionalityType: 2,
      ipfsHash: 'bafybeif4fcle3vgljfnkzlbdcxfp4hvmtbv3kqfthgxd4hjpfhkjnidka',
      status: CreditStatus.ACTIVE,
      tokenId: '0xdeadbeef56789012',
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 4,
      projectId: 'SEA-BLUE-001',
      methodology: 'VCS:VM0033',
      vintageStart: new Date('2023-01-01'),
      vintageEnd: new Date('2023-12-31'),
      tonnes: 5000,
      geography: 'ID',
      serialPrefix: 'SEA-BLUE-VCS0033-',
      sdgFlags: 0b1000001000000,
      permanenceRating: 91,
      bufferContributionPct: 5,
      additionalityType: 1,
      ipfsHash: 'bafybeiezt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      status: CreditStatus.RETIRED,
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 5,
      projectId: 'SAH-SOL-001',
      methodology: 'GS:TEC-V1.0',
      vintageStart: new Date('2024-01-01'),
      vintageEnd: new Date('2024-12-31'),
      tonnes: 1200,
      geography: 'NG',
      serialPrefix: 'SAH-SOL-GSTECV1-',
      sdgFlags: 0b0000010110001,
      permanenceRating: 68,
      bufferContributionPct: 8,
      additionalityType: 0,
      ipfsHash: 'bafybeidwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      status: CreditStatus.PENDING,
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 6,
      projectId: 'AND-FOR-001',
      methodology: 'VCS:VM0015',
      vintageStart: new Date('2019-01-01'),
      vintageEnd: new Date('2023-12-31'),
      tonnes: 150000,
      geography: 'PE',
      serialPrefix: 'AND-FOR-VCS0015-',
      sdgFlags: 0b1000001001101,
      permanenceRating: 83,
      bufferContributionPct: 12,
      additionalityType: 1,
      ipfsHash: 'bafybeif4fcle3vgljfnkzlbdcxfp4hvmtbv3kqfthgxd4hjpfhkjnidka',
      status: CreditStatus.PENDING,
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 7,
      projectId: 'GHA-COOK-001',
      methodology: 'GS:AMS-II.G',
      vintageStart: new Date('2022-01-01'),
      vintageEnd: new Date('2024-06-30'),
      tonnes: 8500,
      geography: 'GH',
      serialPrefix: 'GHA-COOK-GSAMSG-',
      sdgFlags: 0b0000010010001,
      permanenceRating: 55,
      bufferContributionPct: 10,
      additionalityType: 0,
      ipfsHash: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      status: CreditStatus.ACTIVE,
      tokenId: '0xcafebabe12345678',
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 8,
      projectId: 'AUS-BIO-001',
      methodology: 'VCS:VM0032',
      vintageStart: new Date('2020-01-01'),
      vintageEnd: new Date('2022-12-31'),
      tonnes: 75000,
      geography: 'AU',
      serialPrefix: 'AUS-BIO-VCS0032-',
      sdgFlags: 0b0001001000000,
      permanenceRating: 78,
      bufferContributionPct: 10,
      additionalityType: 1,
      ipfsHash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      status: CreditStatus.ACTIVE,
      tokenId: '0x1111222233334444',
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 9,
      projectId: 'MNG-GRS-001',
      methodology: 'CDM:ACM0001',
      vintageStart: new Date('2018-01-01'),
      vintageEnd: new Date('2023-12-31'),
      tonnes: 320000,
      geography: 'MN',
      serialPrefix: 'MNG-GRS-CDMACM-',
      sdgFlags: 0b0001000000000,
      permanenceRating: 62,
      bufferContributionPct: 18,
      additionalityType: 2,
      ipfsHash: 'bafybeiezt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      status: CreditStatus.REJECTED,
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
    {
      creditId: 10,
      projectId: 'PHY-MNG-001',
      methodology: 'VCS:VM0042',
      vintageStart: new Date('2023-01-01'),
      vintageEnd: new Date('2024-12-31'),
      tonnes: 60000,
      geography: 'US',
      serialPrefix: 'PHY-MNG-VCS0042-',
      sdgFlags: 0b0000001000001,
      permanenceRating: 81,
      bufferContributionPct: 5,
      additionalityType: 0,
      ipfsHash: 'bafybeidwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      status: CreditStatus.ACTIVE,
      tokenId: '0x5555666677778888',
      issuerId: issuerUser.id,
      ownerId: issuerUser.id,
    },
  ];

  for (const credit of creditData) {
    await prisma.credit.upsert({
      where: { creditId: credit.creditId },
      update: credit,
      create: credit,
    });
  }

  console.log(`Seeded ${creditData.length} credits`);
  console.log(`Seeded ${verifierRecords.length} verifiers`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

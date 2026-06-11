import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { JwtService } from '@nestjs/jwt';

describe('Certificates Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let userId: string;

  const mockStellarService = {
    getCertificateHash: jest.fn().mockResolvedValue('abc123hash'),
    submitCredit: jest.fn().mockResolvedValue('tx-hash-123'),
    approveAndMint: jest.fn().mockResolvedValue('mint-tx-hash-456'),
    rejectCredit: jest.fn().mockResolvedValue(true),
    retire: jest.fn().mockResolvedValue({
      txHash: '0xretiretx',
      ledgerSequence: 12345,
    }),
    getCredit: jest.fn().mockResolvedValue({ creditId: 1, status: 'RETIRED' }),
    getOwner: jest.fn().mockResolvedValue('GXXX...'),
    isRetired: jest.fn().mockResolvedValue(false),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StellarService)
      .useValue(mockStellarService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.certificate.deleteMany();
    await prisma.retirement.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { stellarPub: 'GCERTUSER1234567890123456789012345678901234567890' },
    });
    userId = user.id;

    authToken = jwtService.sign({ sub: user.id, wallet: user.stellarPub });
  });

  afterAll(async () => {
    await prisma.certificate.deleteMany();
    await prisma.retirement.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /certificates/verify', () => {
    it('should return valid=false for non-existent hash', async () => {
      const res = await request(app.getHttpServer())
        .post('/certificates/verify')
        .send({ certificateHash: 'nonexistent' })
        .expect(201);

      expect(res.body.valid).toBe(false);
    });

    it('should verify an existing certificate', async () => {
      const credit = await prisma.credit.create({
        data: {
          creditId: 1,
          projectId: 'CERT-VERIFY',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'CERT-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmCertVerify',
          status: 'RETIRED',
          issuerId: userId,
          ownerId: userId,
        },
      });

      const retirement = await prisma.retirement.create({
        data: {
          creditId: credit.id,
          retiredById: userId,
          beneficiary: 'Test Corp',
          reason: 'Offsetting',
          accountingPeriod: '2024',
          tonnesRetired: 100,
          txHash: '0xretire',
          ledgerSequence: 12345,
          certificateHash: 'abc123hash',
        },
      });

      const certificate = await prisma.certificate.create({
        data: {
          userId,
          creditId: credit.id,
          txHash: '0xretire',
          metadata: { projectId: 'CERT-VERIFY' },
          certificateHash: 'abc123hash',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/certificates/verify')
        .send({ certificateHash: 'abc123hash' })
        .expect(201);

      expect(res.body.valid).toBe(true);
      expect(res.body.certificate.id).toBe(certificate.id);
      expect(res.body.retirement.creditId).toBe(1);
    });
  });

  describe('POST /certificates/batch', () => {
    it('should generate certificates for retired credits', async () => {
      const credit = await prisma.credit.create({
        data: {
          creditId: 10,
          projectId: 'BATCH-001',
          methodology: 'VCS:VM0042',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 500,
          geography: 'KE',
          serialPrefix: 'BAT-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmBatch',
          status: 'RETIRED',
          issuerId: userId,
          ownerId: userId,
        },
      });

      await prisma.retirement.create({
        data: {
          creditId: credit.id,
          retiredById: userId,
          beneficiary: 'Green Co',
          reason: 'Carbon neutral',
          accountingPeriod: '2024',
          tonnesRetired: 500,
          txHash: '0xbatchtx',
          ledgerSequence: 54321,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/certificates/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ creditIds: [10] })
        .expect(201);

      expect(res.body.generated).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.results[0].status).toBe('generated');
    });

    it('should reject unauthenticated batch request', async () => {
      await request(app.getHttpServer())
        .post('/certificates/batch')
        .send({ creditIds: [1] })
        .expect(401);
    });

    it('should reject empty creditIds array', async () => {
      await request(app.getHttpServer())
        .post('/certificates/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ creditIds: [] })
        .expect(400);
    });
  });

  describe('GET /certificates/:id', () => {
    it('should return certificate metadata', async () => {
      const credit = await prisma.credit.create({
        data: {
          creditId: 20,
          projectId: 'GET-CERT',
          methodology: 'GS:AR-ACM0003',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 200,
          geography: 'IN',
          serialPrefix: 'GET-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmGetCert',
          status: 'RETIRED',
          issuerId: userId,
          ownerId: userId,
        },
      });

      await prisma.retirement.create({
        data: {
          creditId: credit.id,
          retiredById: userId,
          beneficiary: 'Retire Corp',
          reason: 'ESG offset',
          accountingPeriod: '2024',
          tonnesRetired: 200,
          txHash: '0xgettx',
          ledgerSequence: 11111,
          certificateHash: 'cert-hash-20',
        },
      });

      const certificate = await prisma.certificate.create({
        data: {
          userId,
          creditId: credit.id,
          txHash: '0xgettx',
          metadata: { projectId: 'GET-CERT', methodology: 'GS:AR-ACM0003' },
          certificateHash: 'cert-hash-20',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/certificates/${certificate.id}`)
        .expect(200);

      expect(res.body.id).toBe(certificate.id);
      expect(res.body.certificateHash).toBe('cert-hash-20');
    });

    it('should return 404 for non-existent certificate', async () => {
      await request(app.getHttpServer())
        .get('/certificates/nonexistent-id')
        .expect(404);
    });
  });

  describe('GET /certificates/:id/pdf', () => {
    it('should return a PDF or placeholder for a valid certificate', async () => {
      const credit = await prisma.credit.create({
        data: {
          creditId: 30,
          projectId: 'PDF-CERT',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'PDF-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmPdf',
          status: 'RETIRED',
          issuerId: userId,
          ownerId: userId,
        },
      });

      const certificate = await prisma.certificate.create({
        data: {
          userId,
          creditId: credit.id,
          txHash: '0xpdftx',
          metadata: { projectId: 'PDF-CERT' },
          certificateHash: 'pdf-hash',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/certificates/${certificate.id}/pdf`)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('should return 404 for non-existent certificate pdf', async () => {
      await request(app.getHttpServer())
        .get('/certificates/nonexistent/pdf')
        .expect(404);
    });
  });

  describe('GET /certificates/owned', () => {
    it('should return owned certificates', async () => {
      const credit = await prisma.credit.create({
        data: {
          creditId: 40,
          projectId: 'OWNED-CERT',
          methodology: 'VCS:VM0015',
          vintageStart: new Date('2022-01-01'),
          vintageEnd: new Date('2022-12-31'),
          tonnes: 300,
          geography: 'CO',
          serialPrefix: 'OWN-',
          sdgFlags: 0,
          permanenceRating: 80,
          bufferContributionPct: 10,
          additionalityType: 1,
          ipfsHash: 'QmOwnedCert',
          status: 'RETIRED',
          issuerId: userId,
          ownerId: userId,
        },
      });

      await prisma.certificate.create({
        data: {
          userId,
          creditId: credit.id,
          txHash: '0xownedtx',
          metadata: { projectId: 'OWNED-CERT' },
          certificateHash: 'owned-hash',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/certificates/owned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated owned request', async () => {
      await request(app.getHttpServer())
        .get('/certificates/owned')
        .expect(401);
    });
  });
});

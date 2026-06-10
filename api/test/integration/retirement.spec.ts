import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { JwtService } from '@nestjs/jwt';

describe('Retirement Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let creditId: number;

  const mockStellarService = {
    retire: jest.fn().mockResolvedValue({
      creditId: 1,
      retiredBy: 'GOWNER...',
      beneficiary: 'Test Corp',
      reason: 'Offsetting emissions',
      accountingPeriod: '2024-Q1',
      txHash: '0xretiretx',
      ledgerSequence: 42,
      timestamp: Date.now(),
    }),
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
    await prisma.retirement.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: { stellarPub: 'GOWNER1234567890123456789012345678901234567890123' },
    });

    authToken = jwtService.sign({ sub: owner.id, wallet: owner.stellarPub });

    const credit = await prisma.credit.create({
      data: {
        creditId: 1,
        projectId: 'RET-001',
        methodology: 'VCS:VM0007',
        vintageStart: new Date('2023-01-01'),
        vintageEnd: new Date('2023-12-31'),
        tonnes: 500,
        geography: 'BR',
        serialPrefix: 'RET-',
        sdgFlags: 0,
        permanenceRating: 50,
        bufferContributionPct: 10,
        additionalityType: 0,
        ipfsHash: 'QmRet',
        status: 'ACTIVE',
        issuerId: owner.id,
        ownerId: owner.id,
      },
    });

    creditId = credit.creditId;
  });

  afterAll(async () => {
    await prisma.retirement.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /credits/:id/retire', () => {
    it('should retire a credit', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credits/${creditId}/retire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Offsetting 2024 emissions',
          beneficiary: 'NetZero Corp',
          accountingPeriod: '2024-Q1',
        })
        .expect(201);

      expect(res.body.txHash).toBe('0xretiretx');
      expect(res.body.beneficiary).toBe('NetZero Corp');
      expect(res.body.tonnesRetired).toBe(500);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post(`/credits/${creditId}/retire`)
        .send({
          reason: 'Test',
          beneficiary: 'Test',
          accountingPeriod: '2024-Q1',
        })
        .expect(401);
    });

    it('should reject for non-existent credit', async () => {
      await request(app.getHttpServer())
        .post('/credits/99999/retire')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Test',
          beneficiary: 'Test',
          accountingPeriod: '2024-Q1',
        })
        .expect(404);
    });

    it('should reject with missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/credits/${creditId}/retire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ beneficiary: 'Test' })
        .expect(400);
    });
  });

  describe('GET /credits/:id/certificate', () => {
    it('should return 400 if credit not retired', async () => {
      await request(app.getHttpServer())
        .get(`/credits/${creditId}/certificate`)
        .expect(400);
    });

    it('should return certificate data for retired credit', async () => {
      await prisma.retirement.create({
        data: {
          creditId: (await prisma.credit.findFirstOrThrow()).id,
          retiredById: (await prisma.user.findFirstOrThrow()).id,
          beneficiary: 'NetZero Corp',
          reason: 'Offsetting',
          accountingPeriod: '2024-Q1',
          tonnesRetired: 500,
          txHash: '0xtx',
          ledgerSequence: 42,
        },
      });

      await prisma.credit.update({
        where: { creditId: 1 },
        data: { status: 'RETIRED' },
      });

      const res = await request(app.getHttpServer())
        .get(`/credits/${creditId}/certificate`)
        .expect(200);

      expect(res.body.credit.creditId).toBe(creditId);
      expect(res.body.retirements).toHaveLength(1);
      expect(res.body.retirements[0].beneficiary).toBe('NetZero Corp');
    });
  });
});

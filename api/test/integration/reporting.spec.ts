import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Reporting Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      data: { stellarPub: 'GREPORT12345678901234567890123456789012345678901' },
    });
    userId = owner.id;
    authToken = jwtService.sign({ sub: owner.id, wallet: owner.stellarPub });

    const credit = await prisma.credit.create({
      data: {
        creditId: 1001,
        projectId: 'REP-001',
        methodology: 'VCS:VM0007',
        vintageStart: new Date('2024-01-01'),
        vintageEnd: new Date('2024-12-31'),
        tonnes: 500,
        geography: 'BR',
        serialPrefix: 'REP-',
        sdgFlags: 0,
        permanenceRating: 50,
        bufferContributionPct: 10,
        additionalityType: 0,
        ipfsHash: 'QmRep',
        status: 'RETIRED',
        issuerId: userId,
        ownerId: userId,
      },
    });

    await prisma.retirement.create({
      data: {
        creditId: credit.id,
        retiredById: userId,
        beneficiary: 'NetZero Corp',
        reason: 'Offsetting 2026 emissions',
        accountingPeriod: '2026-Q1',
        tonnesRetired: 500,
        txHash: '0xreporttx',
        ledgerSequence: 42,
        certificateHash: 'reporthash-1',
      },
    });
  });

  afterAll(async () => {
    await prisma.retirement.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /reporting/scope3', () => {
    it('returns a JSON scope 3 report for the authenticated wallet', async () => {
      const res = await request(app.getHttpServer())
        .get('/reporting/scope3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.reportType).toBe('scope3');
      expect(res.body.summary.totalTonnesRetired).toBe(500);
      expect(res.body.summary.totalRetirements).toBe(1);
      expect(res.body.summary.totalCredits).toBe(1);
      expect(res.body.summary.byMethodology[0]).toEqual({
        methodology: 'VCS:VM0007',
        tonnes: 500,
        retirements: 1,
      });
      expect(res.body.lineItems).toHaveLength(1);
      expect(res.body.lineItems[0].creditId).toBe(1001);
      expect(res.body.lineItems[0].beneficiary).toBe('NetZero Corp');
      expect(res.body.lineItems[0].certificateHash).toBe('reporthash-1');
    });

    it('exports a CSV with a BOM and populated header row', async () => {
      const res = await request(app.getHttpServer())
        .get('/reporting/scope3?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /text\/csv/)
        .expect('Content-Disposition', /scope3-all\.csv/);

      const body = res.text;
      expect(body.startsWith('\uFEFF')).toBe(true);
      const lines = body.replace('\uFEFF', '').trim().split('\n');
      expect(lines[0]).toContain('credit_id');
      expect(lines[0]).toContain('certificate_hash');
      expect(lines[1]).toContain('1001');
      expect(lines[1]).toContain('NetZero Corp');
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/reporting/scope3').expect(401);
    });

    it('rejects an invalid format value', async () => {
      await request(app.getHttpServer())
        .get('/reporting/scope3?format=xml')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});

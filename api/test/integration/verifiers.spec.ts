import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { JwtService } from '@nestjs/jwt';

describe('Verifiers Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let verifierId: string;

  const mockStellarService = {
    registerVerifier: jest.fn().mockResolvedValue(true),
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
    await prisma.approval.deleteMany();
    await prisma.verifier.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { stellarPub: 'GVERIFIER2222222222222222222222222222222222222222' },
    });

    authToken = jwtService.sign({ sub: user.id, wallet: user.stellarPub });
  });

  afterAll(async () => {
    await prisma.approval.deleteMany();
    await prisma.verifier.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /verifiers/register', () => {
    it('should register a new verifier', async () => {
      const res = await request(app.getHttpServer())
        .post('/verifiers/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stake: 50000 })
        .expect(201);

      expect(res.body.stake).toBe(50000);
      expect(res.body.status).toBe('ACTIVE');
      verifierId = res.body.id;
    });

    it('should reject duplicate registration', async () => {
      await request(app.getHttpServer())
        .post('/verifiers/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stake: 50000 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/verifiers/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stake: 50000 })
        .expect(400);
    });

    it('should require auth', async () => {
      await request(app.getHttpServer())
        .post('/verifiers/register')
        .send({ stake: 50000 })
        .expect(401);
    });

    it('should reject with invalid stake', async () => {
      await request(app.getHttpServer())
        .post('/verifiers/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stake: 0 })
        .expect(400);
    });
  });

  describe('GET /verifiers', () => {
    it('should return empty list when no verifiers', async () => {
      const res = await request(app.getHttpServer())
        .get('/verifiers')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return verifier list', async () => {
      const user = await prisma.user.findFirstOrThrow();
      await prisma.verifier.create({
        data: {
          userId: user.id,
          stake: 50000,
          status: 'ACTIVE',
          reputation: 90,
          heartbeatAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .get('/verifiers')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].stake).toBe(50000);
    });
  });

  describe('GET /verifiers/pending', () => {
    it('should return pending credits', async () => {
      const user = await prisma.user.findFirstOrThrow();
      await prisma.credit.create({
        data: {
          creditId: 1,
          projectId: 'PEND-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'PEND-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmPend',
          status: 'PENDING',
          issuerId: user.id,
          ownerId: user.id,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/verifiers/pending')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('PENDING');
    });
  });

  describe('GET /verifiers/:id', () => {
    it('should return 404 for non-existent verifier', async () => {
      await request(app.getHttpServer())
        .get('/verifiers/nonexistent-id')
        .expect(404);
    });

    it('should return verifier profile', async () => {
      const user = await prisma.user.findFirstOrThrow();
      const verifier = await prisma.verifier.create({
        data: {
          userId: user.id,
          stake: 75000,
          status: 'ACTIVE',
          reputation: 95,
          heartbeatAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/verifiers/${verifier.id}`)
        .expect(200);

      expect(res.body.stake).toBe(75000);
      expect(res.body.reputation).toBe(95);
    });
  });

  describe('GET /verifiers/:id/approvals', () => {
    it('should return approvals for a verifier', async () => {
      const user = await prisma.user.findFirstOrThrow();
      const verifier = await prisma.verifier.create({
        data: {
          userId: user.id,
          stake: 30000,
          status: 'ACTIVE',
          heartbeatAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/verifiers/${verifier.id}/approvals`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /verifiers/:id/heartbeat', () => {
    it('should update heartbeat timestamp', async () => {
      const user = await prisma.user.findFirstOrThrow();
      const verifier = await prisma.verifier.create({
        data: {
          userId: user.id,
          stake: 10000,
          status: 'ACTIVE',
          heartbeatAt: new Date('2020-01-01'),
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/verifiers/${verifier.id}/heartbeat`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(new Date(res.body.heartbeatAt).getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime(),
      );
    });

    it('should reject for non-existent verifier', async () => {
      await request(app.getHttpServer())
        .post('/verifiers/bad-id/heartbeat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

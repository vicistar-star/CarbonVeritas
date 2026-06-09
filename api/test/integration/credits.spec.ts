import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { IpfsService } from '../../src/ipfs/ipfs.service';
import { JwtService } from '@nestjs/jwt';

describe('Credits Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let verifierToken: string;
  let creditId: number;

  const mockStellarService = {
    submitCredit: jest.fn().mockResolvedValue('tx-hash-123'),
    approveAndMint: jest.fn().mockResolvedValue('mint-tx-hash-456'),
    rejectCredit: jest.fn().mockResolvedValue(true),
    getCredit: jest.fn().mockResolvedValue({ creditId: 1, status: 'ACTIVE' }),
    getProvenance: jest.fn().mockResolvedValue([]),
    getOwner: jest.fn().mockResolvedValue('GXXX...'),
    transferCredit: jest.fn().mockResolvedValue(true),
  };

  const mockIpfsService = {
    pinJson: jest.fn().mockResolvedValue({
      ipfsHash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      pinSize: 512,
      timestamp: new Date().toISOString(),
    }),
    pinFile: jest.fn().mockResolvedValue({
      ipfsHash: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      pinSize: 1024,
      timestamp: new Date().toISOString(),
    }),
    fetch: jest.fn().mockResolvedValue({}),
    unpin: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    process.env.VERIFIER_THRESHOLD = '1';
    process.env.VERIFIER_QUORUM = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StellarService)
      .useValue(mockStellarService)
      .overrideProvider(IpfsService)
      .useValue(mockIpfsService)
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
      data: { stellarPub: 'GUSER12345678901234567890123456789012345678901234' },
    });

    const verifierUser = await prisma.user.create({
      data: { stellarPub: 'GVERIFIER1111111111111111111111111111111111111111' },
    });

    await prisma.verifier.create({
      data: {
        userId: verifierUser.id,
        status: 'ACTIVE',
        stake: 50000,
        reputation: 90,
      },
    });

    authToken = jwtService.sign({ sub: user.id, wallet: user.stellarPub });
    verifierToken = jwtService.sign({ sub: verifierUser.id, wallet: verifierUser.stellarPub });
  });

  afterAll(async () => {
    await prisma.approval.deleteMany();
    await prisma.verifier.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /credits', () => {
    it('should return empty list when no credits exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/credits')
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return paginated credits', async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 1,
          projectId: 'TEST-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'TEST-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmTest',
          status: 'PENDING',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/credits')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should filter by methodology', async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.createMany({
        data: [
          {
            creditId: 2,
            projectId: 'T2',
            methodology: 'VCS:VM0007',
            vintageStart: new Date('2023-01-01'),
            vintageEnd: new Date('2023-12-31'),
            tonnes: 100,
            geography: 'BR',
            serialPrefix: 'T2-',
            sdgFlags: 0,
            permanenceRating: 50,
            bufferContributionPct: 10,
            additionalityType: 0,
            ipfsHash: 'QmT2',
            status: 'PENDING',
            issuerId: user!.id,
            ownerId: user!.id,
          },
          {
            creditId: 3,
            projectId: 'T3',
            methodology: 'GS:AR-ACM0003',
            vintageStart: new Date('2023-01-01'),
            vintageEnd: new Date('2023-12-31'),
            tonnes: 200,
            geography: 'KE',
            serialPrefix: 'T3-',
            sdgFlags: 0,
            permanenceRating: 50,
            bufferContributionPct: 10,
            additionalityType: 0,
            ipfsHash: 'QmT3',
            status: 'PENDING',
            issuerId: user!.id,
            ownerId: user!.id,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/credits?methodology=VCS')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].methodology).toBe('VCS:VM0007');
    });
  });

  describe('GET /credits/owned', () => {
    it('should return owned credits for authenticated user', async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 4,
          projectId: 'OWNED-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'OWN-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmOwned',
          status: 'ACTIVE',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/credits/owned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/credits/owned')
        .expect(401);
    });
  });

  describe('GET /credits/:id', () => {
    it('should return a credit by ID', async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 5,
          projectId: 'GET-001',
          methodology: 'VCS:VM0015',
          vintageStart: new Date('2022-01-01'),
          vintageEnd: new Date('2022-12-31'),
          tonnes: 500,
          geography: 'PE',
          serialPrefix: 'GET-',
          sdgFlags: 0,
          permanenceRating: 80,
          bufferContributionPct: 10,
          additionalityType: 1,
          ipfsHash: 'QmGet',
          status: 'ACTIVE',
          tokenId: '0x1234',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/credits/5')
        .expect(200);

      expect(res.body.creditId).toBe(5);
      expect(res.body.projectId).toBe('GET-001');
    });

    it('should return 404 for non-existent credit', async () => {
      await request(app.getHttpServer())
        .get('/credits/99999')
        .expect(404);
    });
  });

  describe('GET /credits/:id/provenance', () => {
    it('should return provenance history', async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 6,
          projectId: 'PROV-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'PROV-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmProv',
          status: 'ACTIVE',
          tokenId: '0x9999',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/credits/6/provenance')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].type).toBe('ISSUANCE');
    });
  });

  describe('POST /credits/issue', () => {
    it('should issue a new credit', async () => {
      const res = await request(app.getHttpServer())
        .post('/credits/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'NEW-001',
          methodology: 'VCS:VM0042',
          vintageStart: '2023-01-01',
          vintageEnd: '2023-12-31',
          tonnes: 1000,
          geography: 'BR',
          sdgCobenefits: [13, 15],
          permanenceRating: 85,
          bufferContributionPct: 10,
          additionalityType: 1,
        })
        .expect(201);

      expect(res.body.projectId).toBe('NEW-001');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.creditId).toBeDefined();
      creditId = res.body.creditId;
    });

    it('should reject with invalid geography', async () => {
      await request(app.getHttpServer())
        .post('/credits/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'INV-001',
          methodology: 'VCS:VM0007',
          vintageStart: '2023-01-01',
          vintageEnd: '2023-12-31',
          tonnes: 100,
          geography: 'BRZ',
        })
        .expect(400);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/credits/issue')
        .send({
          projectId: 'NOAUTH-001',
          methodology: 'VCS:VM0007',
          vintageStart: '2023-01-01',
          vintageEnd: '2023-12-31',
          tonnes: 100,
          geography: 'BR',
        })
        .expect(401);
    });
  });

  describe('POST /credits/:id/approve', () => {
    beforeEach(async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 10,
          projectId: 'APPR-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'APPR-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmAppr',
          status: 'PENDING',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });
    });

    it('should approve a pending credit as verifier', async () => {
      const res = await request(app.getHttpServer())
        .post('/credits/10/approve')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ comments: 'All documentation verified.' })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');
    });

    it('should reject approval from non-verifier', async () => {
      await request(app.getHttpServer())
        .post('/credits/10/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comments: 'Looks good' })
        .expect(403);
    });

    it('should reject approval without auth', async () => {
      await request(app.getHttpServer())
        .post('/credits/10/approve')
        .send({ comments: 'Looks good' })
        .expect(401);
    });
  });

  describe('POST /credits/:id/reject', () => {
    beforeEach(async () => {
      const user = await prisma.user.findFirst();
      await prisma.credit.create({
        data: {
          creditId: 20,
          projectId: 'REJ-001',
          methodology: 'VCS:VM0007',
          vintageStart: new Date('2023-01-01'),
          vintageEnd: new Date('2023-12-31'),
          tonnes: 100,
          geography: 'BR',
          serialPrefix: 'REJ-',
          sdgFlags: 0,
          permanenceRating: 50,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'QmRej',
          status: 'PENDING',
          issuerId: user!.id,
          ownerId: user!.id,
        },
      });
    });

    it('should reject a pending credit as verifier', async () => {
      const res = await request(app.getHttpServer())
        .post('/credits/20/reject')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'Insufficient documentation.' })
        .expect(201);

      expect(res.body.status).toBe('REJECTED');
    });

    it('should require a reason', async () => {
      await request(app.getHttpServer())
        .post('/credits/20/reject')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(400);
    });
  });
});

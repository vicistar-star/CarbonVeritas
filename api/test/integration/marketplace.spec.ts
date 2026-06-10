import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { JwtService } from '@nestjs/jwt';

describe('Marketplace Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let sellerToken: string;
  let buyerToken: string;
  let creditId: number;

  const mockStellarService = {
    createOffer: jest.fn().mockResolvedValue(1),
    buyCredits: jest.fn().mockResolvedValue(true),
    cancelOffer: jest.fn().mockResolvedValue(true),
    transferCredit: jest.fn().mockResolvedValue(true),
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
    await prisma.trade.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();

    const seller = await prisma.user.create({
      data: { stellarPub: 'GSELLER12345678901234567890123456789012345678901' },
    });

    const buyer = await prisma.user.create({
      data: { stellarPub: 'GBUYER123456789012345678901234567890123456789012' },
    });

    sellerToken = jwtService.sign({ sub: seller.id, wallet: seller.stellarPub });
    buyerToken = jwtService.sign({ sub: buyer.id, wallet: buyer.stellarPub });

    const credit = await prisma.credit.create({
      data: {
        creditId: 1,
        projectId: 'MKT-001',
        methodology: 'VCS:VM0007',
        vintageStart: new Date('2023-01-01'),
        vintageEnd: new Date('2023-12-31'),
        tonnes: 1000,
        geography: 'BR',
        serialPrefix: 'MKT-',
        sdgFlags: 0,
        permanenceRating: 50,
        bufferContributionPct: 10,
        additionalityType: 0,
        ipfsHash: 'QmMkt',
        status: 'ACTIVE',
        issuerId: seller.id,
        ownerId: seller.id,
      },
    });

    creditId = credit.creditId;
  });

  afterAll(async () => {
    await prisma.trade.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /marketplace/offer', () => {
    it('should create a sell offer', async () => {
      const res = await request(app.getHttpServer())
        .post('/marketplace/offer')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          creditId: 1,
          pricePerTonne: 12.5,
          amount: 100,
          currency: 'USDC',
        })
        .expect(201);

      expect(res.body.offerId).toBeDefined();
      expect(res.body.pricePerTonne).toBe(12.5);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('should reject offer for non-owned credit', async () => {
      await request(app.getHttpServer())
        .post('/marketplace/offer')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          creditId: 1,
          pricePerTonne: 10,
          amount: 50,
          currency: 'USDC',
        })
        .expect(403);
    });

    it('should require auth', async () => {
      await request(app.getHttpServer())
        .post('/marketplace/offer')
        .send({
          creditId: 1,
          pricePerTonne: 10,
          amount: 50,
          currency: 'USDC',
        })
        .expect(401);
    });
  });

  describe('POST /marketplace/buy/:id', () => {
    beforeEach(async () => {
      const user = await prisma.user.findFirst({ where: { stellarPub: 'GSELLER12345678901234567890123456789012345678901' } });
      const credit = await prisma.credit.findFirst();
      await prisma.offer.create({
        data: {
          offerId: 1,
          creditId: credit!.id,
          sellerId: user!.id,
          pricePerTonne: 15,
          amount: 200,
          currency: 'USDC',
          status: 'ACTIVE',
        },
      });
    });

    it('should execute a purchase', async () => {
      const res = await request(app.getHttpServer())
        .post('/marketplace/buy/1')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 50 })
        .expect(201);

      expect(res.body.amount).toBe(50);
      expect(res.body.totalPrice).toBe(750);
    });

    it('should reject buying own offer', async () => {
      await request(app.getHttpServer())
        .post('/marketplace/buy/1')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 50 })
        .expect(400);
    });
  });

  describe('DELETE /marketplace/offer/:id', () => {
    beforeEach(async () => {
      const user = await prisma.user.findFirst({ where: { stellarPub: 'GSELLER12345678901234567890123456789012345678901' } });
      const credit = await prisma.credit.findFirst();
      await prisma.offer.create({
        data: {
          offerId: 2,
          creditId: credit!.id,
          sellerId: user!.id,
          pricePerTonne: 20,
          amount: 100,
          currency: 'USDC',
          status: 'ACTIVE',
        },
      });
    });

    it('should cancel own offer', async () => {
      const res = await request(app.getHttpServer())
        .delete('/marketplace/offer/2')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('should reject cancelling another users offer', async () => {
      await request(app.getHttpServer())
        .delete('/marketplace/offer/2')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('GET /marketplace/listings', () => {
    it('should return empty list when no offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/marketplace/listings')
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return active offers', async () => {
      const user = await prisma.user.findFirst({ where: { stellarPub: 'GSELLER12345678901234567890123456789012345678901' } });
      const credit = await prisma.credit.findFirst();
      await prisma.offer.create({
        data: {
          offerId: 3,
          creditId: credit!.id,
          sellerId: user!.id,
          pricePerTonne: 10,
          amount: 500,
          currency: 'USDC',
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/marketplace/listings')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /marketplace/history', () => {
    it('should return trade history for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/marketplace/history')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/marketplace/history')
        .expect(401);
    });
  });

  describe('GET /marketplace/price-history', () => {
    it('should return price history array', async () => {
      const res = await request(app.getHttpServer())
        .get('/marketplace/price-history')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /marketplace/stats', () => {
    it('should return marketplace stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/marketplace/stats')
        .expect(200);

      expect(res.body).toHaveProperty('activeOffers');
      expect(res.body).toHaveProperty('totalVolume');
      expect(res.body).toHaveProperty('vwap');
    });
  });
});

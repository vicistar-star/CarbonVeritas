import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { JwtService } from '@nestjs/jwt';

describe('Webhooks Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let secondToken: string;
  let userId: string;
  let secondUserId: string;

  const mockStellarService = {};

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
    await prisma.webhook.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { stellarPub: 'GWBUSER1111111111111111111111111111111111111111' },
    });
    userId = user.id;

    const secondUser = await prisma.user.create({
      data: { stellarPub: 'GWBUSER2222222222222222222222222222222222222222' },
    });
    secondUserId = secondUser.id;

    authToken = jwtService.sign({ sub: user.id, wallet: user.stellarPub });
    secondToken = jwtService.sign({ sub: secondUser.id, wallet: secondUser.stellarPub });
  });

  afterAll(async () => {
    await prisma.webhook.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /webhooks', () => {
    it('should register a new webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['credit.submitted', 'credit.approved'],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.url).toBe('https://example.com/webhook');
      expect(res.body.secret).toBeDefined();
      expect(res.body.events).toEqual(['credit.submitted', 'credit.approved']);
      expect(res.body.active).toBe(true);
    });

    it('should reject an invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'not-a-valid-url',
          events: ['credit.submitted'],
        })
        .expect(400);
    });

    it('should reject empty events array', async () => {
      await request(app.getHttpServer())
        .post('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: [],
        })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['credit.submitted'],
        })
        .expect(401);
    });
  });

  describe('GET /webhooks', () => {
    it('should list registered webhooks', async () => {
      await prisma.webhook.create({
        data: {
          userId,
          url: 'https://example.com/wh1',
          secret: 'test-secret',
          events: ['credit.submitted'],
        },
      });

      await prisma.webhook.create({
        data: {
          userId,
          url: 'https://example.com/wh2',
          secret: 'test-secret-2',
          events: ['credit.approved', 'credit.minted'],
        },
      });

      const res = await request(app.getHttpServer())
        .get('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should not include secrets in list response', async () => {
      await prisma.webhook.create({
        data: {
          userId,
          url: 'https://example.com/wh',
          secret: 'super-secret-value',
          events: ['credit.submitted'],
        },
      });

      const res = await request(app.getHttpServer())
        .get('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body[0].secret).toBeUndefined();
    });

    it('should only return webhooks for the authenticated user', async () => {
      await prisma.webhook.create({
        data: {
          userId,
          url: 'https://example.com/user1',
          secret: 's1',
          events: ['credit.submitted'],
        },
      });

      await prisma.webhook.create({
        data: {
          userId: secondUserId,
          url: 'https://example.com/user2',
          secret: 's2',
          events: ['credit.approved'],
        },
      });

      const res = await request(app.getHttpServer())
        .get('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].url).toContain('user1');
    });
  });

  describe('DELETE /webhooks/:id', () => {
    it('should delete own webhook', async () => {
      const webhook = await prisma.webhook.create({
        data: {
          userId,
          url: 'https://example.com/delete-me',
          secret: 'del-secret',
          events: ['credit.submitted'],
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/webhooks/${webhook.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.deleted).toBe(true);

      const check = await prisma.webhook.findUnique({ where: { id: webhook.id } });
      expect(check).toBeNull();
    });

    it('should reject deleting another users webhook', async () => {
      const webhook = await prisma.webhook.create({
        data: {
          userId: secondUserId,
          url: 'https://example.com/not-mine',
          secret: 'not-mine',
          events: ['credit.submitted'],
        },
      });

      await request(app.getHttpServer())
        .delete(`/webhooks/${webhook.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent webhook', async () => {
      await request(app.getHttpServer())
        .delete('/webhooks/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /webhooks/:id/test', () => {
    it('should send a test payload to the webhook URL', async () => {
      const webhook = await prisma.webhook.create({
        data: {
          userId,
          url: 'https://httpbin.org/post',
          secret: 'test-secret',
          events: ['credit.submitted'],
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/webhooks/${webhook.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.webhookId).toBe(webhook.id);
      expect(res.body.success).toBeDefined();
    });

    it('should reject test on another users webhook', async () => {
      const webhook = await prisma.webhook.create({
        data: {
          userId: secondUserId,
          url: 'https://example.com/not-mine',
          secret: 'not-mine',
          events: ['credit.submitted'],
        },
      });

      await request(app.getHttpServer())
        .post(`/webhooks/${webhook.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});

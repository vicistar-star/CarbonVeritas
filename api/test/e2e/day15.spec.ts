import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StellarService } from '../../src/stellar/stellar.service';
import { IpfsService } from '../../src/ipfs/ipfs.service';
import {
  Keypair,
  Networks,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

describe('Day 15 E2E smoke flows', () => {
  let app: INestApplication;
  let prisma: PrismaService & ReturnType<typeof createInMemoryPrisma>;
  let token: string;
  let verifierToken: string;

  const serverKeypair = Keypair.random();
  const userKeypair = Keypair.random();
  const verifierKeypair = Keypair.random();
  const networkPassphrase = Networks.TESTNET;

  const authenticate = async (keypair: Keypair): Promise<string> => {
    const challenge = await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ wallet: keypair.publicKey() })
      .expect(201);
    const tx = TransactionBuilder.fromXDR(challenge.body.transaction, networkPassphrase);
    tx.sign(keypair);
    const signed = tx.toEnvelope().toXDR('base64');
    const auth = await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        wallet: keypair.publicKey(),
        signedChallenge: signed,
        challengeId: challenge.body.challengeId,
      })
      .expect(201);
    return auth.body.accessToken;
  };

  const stellar = {
    submitCredit: jest.fn().mockResolvedValue('tx-submit'),
    approveAndMint: jest.fn().mockResolvedValue('tx-mint'),
    rejectCredit: jest.fn().mockResolvedValue(true),
    transferCredit: jest.fn().mockResolvedValue(true),
    retire: jest.fn().mockResolvedValue({ txHash: 'tx-retire', ledgerSequence: 11 }),
    isRetired: jest.fn().mockResolvedValue(false),
    createOffer: jest.fn().mockResolvedValue(1),
    buyCredits: jest.fn().mockResolvedValue(true),
    cancelOffer: jest.fn().mockResolvedValue(true),
    registerVerifier: jest.fn().mockResolvedValue(true),
    getCertificateHash: jest.fn().mockResolvedValue('certificate-hash'),
  };
  const ipfs = {
    pinJson: jest.fn().mockResolvedValue({ ipfsHash: 'bafyday15', pinSize: 20, timestamp: new Date().toISOString() }),
    pinFile: jest.fn(),
    fetch: jest.fn(),
    unpin: jest.fn(),
  };

  function createInMemoryPrisma() {
    const state = {
      users: [] as Array<Record<string, any>>,
      verifiers: [] as Array<Record<string, any>>,
      credits: [] as Array<Record<string, any>>,
      approvals: [] as Array<Record<string, any>>,
      retirements: [] as Array<Record<string, any>>,
      certificates: [] as Array<Record<string, any>>,
      offers: [] as Array<Record<string, any>>,
      trades: [] as Array<Record<string, any>>,
      challenges: [] as Array<Record<string, any>>,
    };
    let sequence = 1;
    const id = (prefix: string) => `${prefix}-${sequence++}`;
    const now = () => new Date();
    const reset = (collection: Array<Record<string, any>>) => {
      collection.splice(0, collection.length);
      return { count: 0 };
    };
    const matches = (row: Record<string, any>, where?: Record<string, any>) => {
      if (!where) return true;
      return Object.entries(where).every(([key, value]) => {
        if (key === 'creditId' && typeof value === 'object' && value !== null && 'in' in value) {
          return (value.in as number[]).includes(row.creditId);
        }
        if (typeof value === 'object' && value !== null && 'contains' in value) {
          return String(row[key]).toLowerCase().includes(String(value.contains).toLowerCase());
        }
        return row[key] === value;
      });
    };
    const includeCreditRelations = (credit: Record<string, any>) => ({
      ...credit,
      issuer: state.users.find((u) => u.id === credit.issuerId),
      owner: state.users.find((u) => u.id === credit.ownerId),
      approvals: state.approvals
        .filter((a) => a.creditId === credit.id)
        .map((a) => ({ ...a, verifier: state.users.find((u) => u.id === a.verifierId) })),
    });

    return {
      user: {
        deleteMany: jest.fn(() => reset(state.users)),
        findUnique: jest.fn(({ where }) => state.users.find((u) => matches(u, where)) ?? null),
        create: jest.fn(({ data }) => {
          const user = { id: id('user'), createdAt: now(), updatedAt: now(), ...data };
          state.users.push(user);
          return user;
        }),
      },
      verifier: {
        deleteMany: jest.fn(() => reset(state.verifiers)),
        create: jest.fn(({ data }) => {
          const verifier = { id: id('verifier'), createdAt: now(), updatedAt: now(), reputation: 0, ...data };
          state.verifiers.push(verifier);
          return verifier;
        }),
        findFirst: jest.fn(({ where }) => state.verifiers.find((v) => matches(v, where)) ?? null),
      },
      credit: {
        deleteMany: jest.fn(() => reset(state.credits)),
        findFirst: jest.fn(({ orderBy, select }: any = {}) => {
          const rows = [...state.credits];
          if (orderBy?.creditId === 'desc') rows.sort((a, b) => b.creditId - a.creditId);
          const found = rows[0] ?? null;
          return found && select?.creditId ? { creditId: found.creditId } : found;
        }),
        create: jest.fn(({ data }) => {
          const credit = { id: id('credit'), createdAt: now(), updatedAt: now(), approvals: [], retirements: [], ...data };
          state.credits.push(credit);
          return includeCreditRelations(credit);
        }),
        findUnique: jest.fn(({ where }) => {
          const credit = state.credits.find((c) => matches(c, where));
          return credit ? includeCreditRelations(credit) : null;
        }),
        findMany: jest.fn(({ where, skip = 0, take = 20 }: any = {}) => {
          let rows = state.credits.filter((c) => matches(c, where));
          if (where?.status) rows = rows.filter((c) => c.status === where.status);
          return rows.slice(skip, skip + take).map(includeCreditRelations);
        }),
        count: jest.fn(({ where }: any = {}) => state.credits.filter((c) => matches(c, where)).length),
        update: jest.fn(({ where, data }) => {
          const credit = state.credits.find((c) => matches(c, where));
          if (!credit) return null;
          Object.assign(credit, data, { updatedAt: now() });
          return includeCreditRelations(credit);
        }),
      },
      approval: {
        deleteMany: jest.fn(() => reset(state.approvals)),
        create: jest.fn(({ data }) => {
          const approval = { id: id('approval'), createdAt: now(), updatedAt: now(), ...data };
          state.approvals.push(approval);
          return approval;
        }),
        count: jest.fn(({ where }) => state.approvals.filter((a) => matches(a, where)).length),
      },
      retirement: {
        deleteMany: jest.fn(() => reset(state.retirements)),
        create: jest.fn(({ data }) => {
          const retirement = { id: id('retirement'), timestamp: now(), createdAt: now(), updatedAt: now(), ...data };
          state.retirements.push(retirement);
          return retirement;
        }),
        findFirst: jest.fn(({ where }) => {
          const retirement = state.retirements.find((r) => matches(r, where));
          if (!retirement) return null;
          const credit = state.credits.find((c) => c.id === retirement.creditId);
          return { ...retirement, credit };
        }),
        updateMany: jest.fn(({ where, data }) => {
          const rows = state.retirements.filter((r) => matches(r, where));
          rows.forEach((r) => Object.assign(r, data));
          return { count: rows.length };
        }),
      },
      certificate: {
        deleteMany: jest.fn(() => reset(state.certificates)),
        create: jest.fn(({ data }) => {
          const certificate = { id: id('certificate'), createdAt: now(), updatedAt: now(), ...data };
          state.certificates.push(certificate);
          return certificate;
        }),
        findFirst: jest.fn(({ where }) => {
          const certificate = state.certificates.find((c) => matches(c, where));
          if (!certificate) return null;
          return { ...certificate, user: state.users.find((u) => u.id === certificate.userId) };
        }),
      },
      offer: { deleteMany: jest.fn(() => reset(state.offers)) },
      trade: { deleteMany: jest.fn(() => reset(state.trades)) },
      challenge: {
        deleteMany: jest.fn(() => reset(state.challenges)),
        create: jest.fn(({ data }) => {
          const challenge = { id: id('challenge'), createdAt: now(), ...data };
          state.challenges.push(challenge);
          return challenge;
        }),
        findUnique: jest.fn(({ where }) =>
          state.challenges.find((c) => c.id === where.id) ?? null,
        ),
        update: jest.fn(({ where, data }) => {
          const challenge = state.challenges.find((c) => c.id === where.id);
          if (!challenge) return null;
          Object.assign(challenge, data);
          return challenge;
        }),
      },
    };
  }

  beforeAll(async () => {
    process.env.VERIFIER_THRESHOLD = '1';
    process.env.JWT_SECRET = 'e2e-jwt-secret';
    process.env.SEP10_SIGNING_KEY = serverKeypair.secret();
    process.env.SEP10_HOME_DOMAIN = 'api.carbonveritas.io';
    process.env.STELLAR_NETWORK_PASSPHRASE = networkPassphrase;
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(createInMemoryPrisma())
      .overrideProvider(StellarService)
      .useValue(stellar)
      .overrideProvider(IpfsService)
      .useValue(ipfs)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.trade.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.approval.deleteMany();
    await prisma.retirement.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.verifier.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.user.deleteMany();

    token = await authenticate(userKeypair);

    verifierToken = await authenticate(verifierKeypair);
    const verifierUser = await prisma.user.findUnique({ where: { stellarPub: verifierKeypair.publicKey() } });
    await prisma.verifier.create({ data: { userId: verifierUser!.id, stake: 50000, status: 'ACTIVE' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs challenge, token, credit issue, approval, listing, retirement, and certificate verification', async () => {
    await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ wallet: userKeypair.publicKey() })
      .expect(201)
      .expect(({ body }) => expect(body.transaction).toEqual(expect.any(String)));

    const issued = await request(app.getHttpServer())
      .post('/credits/issue')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId: 'DAY15-001',
        methodology: 'VCS:VM0007',
        vintageStart: '2025-01-01',
        vintageEnd: '2025-12-31',
        tonnes: 25,
        geography: 'BR',
      })
      .expect(201);

    const creditId = issued.body.creditId;

    await request(app.getHttpServer())
      .post(`/credits/${creditId}/approve`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({ comments: 'approved in e2e' })
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('ACTIVE'));

    await request(app.getHttpServer())
      .get('/credits?status=ACTIVE')
      .expect(200)
      .expect(({ body }) => expect(body.meta.total).toBeGreaterThanOrEqual(1));

    await request(app.getHttpServer())
      .post(`/credits/${creditId}/retire`)
      .set('Authorization', `Bearer ${token}`)
      .send({ beneficiary: 'Day 15 Buyer', reason: 'E2E offset', accountingPeriod: '2026-06' })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { stellarPub: 'GDAY15USER111111111111111111111111111111111111111' } });
    const credit = await prisma.credit.findUnique({ where: { creditId } });
    const certificate = await prisma.certificate.create({
      data: {
        userId: user!.id,
        creditId: credit!.id,
        txHash: 'tx-retire',
        certificateHash: 'certificate-hash',
        metadata: { creditId, projectId: 'DAY15-001' },
      },
    });
    await prisma.retirement.updateMany({ where: { creditId: credit!.id }, data: { certificateHash: 'certificate-hash' } });

    await request(app.getHttpServer())
      .post('/certificates/verify')
      .send({ certificateHash: certificate.certificateHash })
      .expect(201)
      .expect(({ body }) => expect(body.valid).toBe(true));
  });
});

import { firstValueFrom, of } from 'rxjs';
import { HealthService } from '../../src/observability/health.service';
import { MetricsInterceptor } from '../../src/observability/metrics.interceptor';
import { MetricsService } from '../../src/observability/metrics.service';
import { createPrismaMock } from './service-mocks';

function createConfig(getter: Record<string, unknown> = {}) {
  return { get: jest.fn((key: string) => getter[key]) };
}

function createSorobanMock() {
  return {
    readScVal: jest.fn(),
    read: jest.fn(),
    invoke: jest.fn(),
    getLatestLedger: jest.fn(),
  };
}

describe('MetricsService', () => {
  it('tracks counters, gauges, and histograms', () => {
    const metrics = new MetricsService();
    metrics.incrementCounter('http_requests_total', { method: 'GET', status: 200 });
    metrics.incrementCounter('http_requests_total', { method: 'GET', status: 200 });
    metrics.incrementCounter('http_requests_total', { method: 'POST', status: 500 });
    metrics.setGauge('active_sessions', 3);
    metrics.observeHistogram('latency_ms', 20);
    metrics.observeHistogram('latency_ms', 120);

    const text = metrics.renderPrometheus();

    expect(text).toContain('http_requests_total{method="GET",status="200"} 2');
    expect(text).toContain('http_requests_total{method="POST",status="500"} 1');
    expect(text).toContain('active_sessions 3');
    expect(text).toContain('latency_ms_sum 140');
    expect(text).toContain('latency_ms_count 2');
    expect(text).toContain('latency_ms_bucket{le="50"} 1');
    expect(text).toContain('latency_ms_bucket{le="250"} 2');
    expect(text).toContain('latency_ms_bucket{le="+Inf"} 2');
  });

  it('keeps label keys independent of insertion order', () => {
    const metrics = new MetricsService();
    metrics.incrementCounter('c', { a: 1, b: 2 });
    metrics.incrementCounter('c', { b: 2, a: 1 });
    expect(metrics.renderPrometheus()).toContain('c{a="1",b="2"} 2');
  });
});

describe('MetricsInterceptor', () => {
  it('records successful requests', async () => {
    const metrics = new MetricsService();
    const interceptor = new MetricsInterceptor(metrics);

    const request = { method: 'GET', originalUrl: '/credits', res: { statusCode: 200 } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    const next = { handle: () => of({}) } as never;

    await firstValueFrom(interceptor.intercept(context, next));

    expect(metrics.snapshot()).toMatchObject({
      counters: [{ name: 'http_requests_total' }],
      histograms: [{ name: 'http_request_duration_ms' }],
    });
  });
});

describe('HealthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let soroban: ReturnType<typeof createSorobanMock>;
  let metrics: MetricsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    soroban = createSorobanMock();
    metrics = new MetricsService();
  });

  function service(config: Record<string, unknown> = {}) {
    return new HealthService(createConfig(config) as never, prisma as never, soroban as never, metrics);
  }

  it('reports ok when DB responds and network is configured', async () => {
    prisma.credit.count.mockResolvedValue(2);
    prisma.retirement.count.mockResolvedValue(1);
    prisma.verifier.count.mockResolvedValue(3);
    prisma.offer.count.mockResolvedValue(4);
    (prisma as { $queryRaw: jest.Mock }).$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
    soroban.getLatestLedger.mockResolvedValue({ sequence: 5, ledgerHash: 'h' });

    const health = await service({ CREDIT_REGISTRY_CONTRACT: 'C1' }).checkHealth();

    expect(health.status).toBe('ok');
    expect(health.checks).toEqual([
      { name: 'database', status: 'ok' },
      { name: 'stellar-network', status: 'ok', detail: 'ledger 5' },
    ]);
  });

  it('degrades when the RPC is unreachable but DB is fine', async () => {
    (prisma as { $queryRaw: jest.Mock }).$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
    soroban.getLatestLedger.mockRejectedValue(new Error('rpc down'));

    const health = await service({ CREDIT_REGISTRY_CONTRACT: 'C1' }).checkHealth();

    expect(health.status).toBe('degraded');
    expect(health.checks[1]).toMatchObject({ name: 'stellar-network', status: 'error' });
  });

  it('returns down when the database check fails', async () => {
    (prisma as { $queryRaw: jest.Mock }).$queryRaw = jest.fn().mockRejectedValue(new Error('db down'));

    const health = await service().checkHealth();

    expect(health.status).toBe('down');
    expect(health.checks[0]).toMatchObject({ name: 'database', status: 'error' });
  });

  it('skips the RPC check when no contracts are configured', async () => {
    (prisma as { $queryRaw: jest.Mock }).$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

    const health = await service().checkHealth();

    expect(health.status).toBe('ok');
    expect(health.checks[1]).toEqual({
      name: 'stellar-network',
      status: 'ok',
      detail: 'not configured',
    });
    expect(soroban.getLatestLedger).not.toHaveBeenCalled();
  });

  it('refreshes business gauges on startup', async () => {
    prisma.credit.count.mockResolvedValue(2);
    prisma.retirement.count.mockResolvedValue(1);
    prisma.verifier.count.mockResolvedValue(3);
    prisma.offer.count.mockResolvedValue(4);

    await service().onModuleInit();

    const text = metrics.renderPrometheus();
    expect(text).toContain('carbonveritas_credits_total 2');
    expect(text).toContain('carbonveritas_retirements_total 1');
    expect(text).toContain('carbonveritas_verifiers_total 3');
    expect(text).toContain('carbonveritas_offers_total 4');
  });

  it('tolerates missing prisma count support', async () => {
    prisma.credit.count.mockRejectedValue(new Error('unsupported'));
    await expect(service().onModuleInit()).resolves.toBeUndefined();
  });
});

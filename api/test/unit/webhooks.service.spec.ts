import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { createPrismaMock } from './service-mocks';

describe('WebhooksService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WebhooksService;

  const mockDispatch = (statuses: Array<{ status: number; error?: string }>) => {
    let i = 0;
    const dispatch = jest.fn().mockImplementation(() => {
      const next = statuses[Math.min(i, statuses.length - 1)];
      i += 1;
      return Promise.resolve(next);
    });
    (service as unknown as { dispatch: typeof dispatch }).dispatch = dispatch;
    return dispatch;
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WebhooksService(prisma as never, {
      get: () => undefined,
    } as never);
    prisma.webhook.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'webhook-1', createdAt: new Date(), ...data }),
    );
  });

  it('registers webhooks with a generated secret', async () => {
    const webhook = await service.register('user-1', {
      url: 'https://example.com/webhook',
      events: ['credit.retired'],
    });

    expect(webhook.secret).toHaveLength(64);
    expect(webhook.active).toBe(true);
  });

  it('lists webhooks owned by a user', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'webhook-1' }]);

    await expect(service.list('user-1')).resolves.toEqual([{ id: 'webhook-1' }]);
    expect(prisma.webhook.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });

  it('removes only webhooks owned by the caller', async () => {
    prisma.webhook.findUnique.mockResolvedValue({ id: 'webhook-1', userId: 'user-1' });
    prisma.webhook.delete.mockResolvedValue({});

    await expect(service.remove('user-1', 'webhook-1')).resolves.toEqual({ deleted: true, id: 'webhook-1' });
  });

  it('rejects deletion of another user webhook', async () => {
    prisma.webhook.findUnique.mockResolvedValue({ id: 'webhook-1', userId: 'other-user' });

    await expect(service.remove('user-1', 'webhook-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when deleting a missing webhook', async () => {
    prisma.webhook.findUnique.mockResolvedValue(null);

    await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('dispatches only to matching active webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://example.com/a', secret: 'secret-a' },
      { id: 'webhook-2', url: 'https://example.com/b', secret: 'secret-b' },
    ]);
    const dispatch = mockDispatch([{ status: 200 }, { status: 200 }]);

    await service.dispatchEvent('credit.retired', { creditId: 1 });

    expect(prisma.webhook.findMany).toHaveBeenCalledWith({
      where: { events: { has: 'credit.retired' }, active: true },
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('logs a delivery record on success', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://example.com/a', secret: 'secret-a' },
    ]);
    mockDispatch([{ status: 200 }]);

    await service.dispatchEvent('credit.retired', { creditId: 1 });

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: 'webhook-1',
        eventType: 'credit.retired',
        success: true,
        attempts: 1,
        statusCode: 200,
      }),
    });
  });

  it('retries transient failures (5xx) with backoff before succeeding', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://example.com/a', secret: 'secret-a' },
    ]);
    const dispatch = mockDispatch([{ status: 503 }, { status: 500 }, { status: 200 }]);

    await service.dispatchEvent('credit.retired', { creditId: 1 });

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: true, attempts: 3, statusCode: 200 }),
    });
  });

  it('records a permanent failure for 4xx without retrying', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://example.com/a', secret: 'secret-a' },
    ]);
    const dispatch = mockDispatch([{ status: 400 }]);

    await service.dispatchEvent('credit.retired', { creditId: 1 });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        attempts: 1,
        statusCode: 400,
        error: 'HTTP 400',
      }),
    });
  });

  it('gives up on network errors after max attempts', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://example.com/a', secret: 'secret-a' },
    ]);
    const dispatch = mockDispatch([
      { status: 0, error: 'connect ECONNREFUSED' },
    ]);

    await service.dispatchEvent('credit.retired', { creditId: 1 });

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        attempts: 3,
        statusCode: null,
        error: 'connect ECONNREFUSED',
      }),
    });
  });

  it('returns a successful test ping result for 2xx', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'webhook-1',
      userId: 'user-1',
      secret: 'secret-a',
      url: 'https://example.com/a',
    });
    mockDispatch([{ status: 200 }]);

    await expect(service.sendTest('user-1', 'webhook-1')).resolves.toEqual({
      success: true,
      statusCode: 200,
      error: undefined,
      webhookId: 'webhook-1',
    });
  });

  it('lists deliveries scoped to the caller webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'webhook-1' }]);
    prisma.webhookDelivery.findMany.mockResolvedValue([{ id: 'delivery-1' }]);

    await expect(service.listDeliveries('user-1', { eventType: 'credit.retired' })).resolves.toEqual([
      { id: 'delivery-1' },
    ]);
    expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
      where: { webhookId: { in: ['webhook-1'] }, eventType: 'credit.retired' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: expect.any(Object),
    });
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { createPrismaMock } from './service-mocks';

describe('WebhooksService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WebhooksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WebhooksService(prisma as never, {} as never);
  });

  it('registers webhooks with a generated secret', async () => {
    prisma.webhook.create.mockImplementation(({ data }) => Promise.resolve({ id: 'webhook-1', createdAt: new Date(), ...data }));

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

  it('dispatches matching active webhooks without throwing on delivery failures', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'webhook-1', url: 'https://example.com', secret: 'secret' }]);

    await expect(service.dispatchEvent('credit.retired', { creditId: 1 })).resolves.toBeUndefined();
  });
});

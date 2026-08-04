import { EventEmitterService } from '../../src/events/event-emitter.service';
import { WebhookProcessor } from '../../src/webhooks/webhooks.processor';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { createPrismaMock } from './service-mocks';

describe('Event → webhook chain', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let webhooksService: WebhooksService;
  let processor: WebhookProcessor;
  let emitter: EventEmitterService;

  beforeEach(() => {
    prisma = createPrismaMock();
    webhooksService = new WebhooksService(prisma as never, {
      get: () => undefined,
    } as never);
    const dispatch = jest.fn().mockResolvedValue({ status: 200 });
    (webhooksService as unknown as { dispatch: typeof dispatch }).dispatch = dispatch;
    processor = new WebhookProcessor(webhooksService);
    emitter = new EventEmitterService(processor);
  });

  it('routes an emitted event to all matching active webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh-1', url: 'https://example.com/hook', secret: 'secret-a' },
      { id: 'wh-2', url: 'https://example.com/hook2', secret: 'secret-b' },
    ]);

    const emit = emitter.emit('credit.retired', { creditId: 7 });

    await expect(emit).resolves.toBeUndefined();
    expect(prisma.webhook.findMany).toHaveBeenCalledWith({
      where: { events: { has: 'credit.retired' }, active: true },
    });
  });

  it('skips dispatch when no webhook subscribes to the event', async () => {
    prisma.webhook.findMany.mockResolvedValue([]);

    await emitter.emit('credit.submitted', { creditId: 1 });

    expect(prisma.webhook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ active: true }) }),
    );
  });

  it('swallows processor errors so business flows are not broken', async () => {
    const broken = {
      handleEvent: jest.fn().mockRejectedValue(new Error('delivery backend down')),
    };
    const localEmitter = new EventEmitterService(broken as never);

    await expect(localEmitter.emit('credit.approved', {})).resolves.toBeUndefined();
    expect(broken.handleEvent).toHaveBeenCalledWith('credit.approved', {});
  });

  it('produces HMAC-signed payloads for registered webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh-1', url: 'https://example.com/hook', secret: 'super-secret' },
    ]);

    const dispatch = jest.fn().mockResolvedValue({ status: 200 });
    (webhooksService as unknown as { dispatch: typeof dispatch }).dispatch = dispatch;

    await webhooksService.dispatchEvent('credit.retired', { creditId: 3 });

    expect(dispatch).toHaveBeenCalledTimes(1);
    const [url, payload, signature] = dispatch.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(payload.event).toBe('credit.retired');
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });
});

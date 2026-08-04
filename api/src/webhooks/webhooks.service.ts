import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(userId: string, dto: CreateWebhookDto) {
    const secret = this.generateSecret();

    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        url: dto.url,
        secret,
        events: dto.events,
        active: true,
      },
    });

    this.logger.log(`Webhook registered: id=${webhook.id}, url=${dto.url}`);

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async list(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks;
  }

  async remove(userId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException('You do not own this webhook');
    }

    await this.prisma.webhook.delete({ where: { id: webhookId } });

    this.logger.log(`Webhook deleted: id=${webhookId}`);

    return { deleted: true, id: webhookId };
  }

  async sendTest(userId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException('You do not own this webhook');
    }

    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook payload from CarbonVeritas',
        webhookId,
      },
    };

    const signature = this.signPayload(webhook.secret, testPayload);

    const result = await this.dispatch(webhook.url, testPayload, signature);
    const success = result.status >= 200 && result.status < 300;
    return {
      success,
      statusCode: result.status,
      error: result.error,
      webhookId,
    };
  }

  async dispatchEvent(eventType: string, data: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        events: { has: eventType },
        active: true,
      },
    });

    if (webhooks.length === 0) return;

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const results = await Promise.allSettled(
      webhooks.map((webhook) =>
        this.deliverWithRetry(webhook, eventType, payload),
      ),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        this.logger.warn(
          `Webhook delivery failed: webhookId=${webhooks[i].id}, error=${result.reason}`,
        );
      }
    }
  }

  private async deliverWithRetry(
    webhook: {
      id: string;
      url: string;
      secret: string;
    },
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const maxAttempts = this.maxAttempts();
    const signature = this.signPayload(webhook.secret, payload);
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const started = Date.now();
      const result = await this.dispatch(webhook.url, payload, signature);
      const durationMs = Date.now() - started;
      lastError = result.error;

      const success = result.status >= 200 && result.status < 300;

      if (success) {
        await this.recordDelivery(webhook, eventType, payload, {
          success: true,
          attempts: attempt,
          statusCode: result.status,
          durationMs,
        });
        this.logger.log(
          `Webhook delivered: webhookId=${webhook.id}, event=${eventType}, attempts=${attempt}, status=${result.status}`,
        );
        return;
      }

      const retryable = result.status === 0 || result.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        await this.recordDelivery(webhook, eventType, payload, {
          success: false,
          attempts: attempt,
          statusCode: result.status === 0 ? null : result.status,
          durationMs,
          error: lastError ?? `HTTP ${result.status}`,
        });
        this.logger.warn(
          `Webhook delivery failed: webhookId=${webhook.id}, event=${eventType}, attempts=${attempt}, status=${result.status}${lastError ? `, error=${lastError}` : ''}`,
        );
        return;
      }

      await this.sleep(this.backoffDelayMs(attempt));
    }
  }

  private async recordDelivery(
    webhook: { id: string },
    eventType: string,
    payload: Record<string, unknown>,
    summary: {
      success: boolean;
      attempts: number;
      statusCode: number | null;
      durationMs: number;
      error?: string;
    },
  ) {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType,
          payload: payload as never,
          success: summary.success,
          attempts: summary.attempts,
          statusCode: summary.statusCode,
          durationMs: summary.durationMs,
          error: summary.error ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record webhook delivery: ${(err as Error).message}`,
      );
    }
  }

  async listDeliveries(
    userId: string,
    options: { eventType?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = webhooks.map((w) => w.id);
    if (ids.length === 0) return [];

    return this.prisma.webhookDelivery.findMany({
      where: {
        webhookId: { in: ids },
        ...(options.eventType ? { eventType: options.eventType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        success: true,
        attempts: true,
        statusCode: true,
        durationMs: true,
        error: true,
        createdAt: true,
      },
    });
  }

  private maxAttempts(): number {
    const raw = this.config.get<string>('WEBHOOK_MAX_ATTEMPTS');
    const parsed = raw ? parseInt(raw, 10) : 3;
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 5) : 3;
  }

  private backoffDelayMs(attempt: number): number {
    const raw = this.config.get<string>('WEBHOOK_RETRY_BASE_MS');
    const base = raw ? parseInt(raw, 10) : 1000;
    const safeBase = Number.isFinite(base) && base > 0 ? base : 1000;
    return safeBase * 2 ** (attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private signPayload(
    secret: string,
    payload: Record<string, unknown>,
  ): string {
    const body = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }

  private async dispatch(
    url: string,
    payload: Record<string, unknown>,
    signature: string,
  ): Promise<{ status: number; error?: string }> {
    try {
      const fetch = await import('node-fetch').then((m) => m.default);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CarbonVeritas-Signature': signature,
          'X-CarbonVeritas-Timestamp': payload.timestamp as string,
          'User-Agent': 'CarbonVeritas-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        timeout: 10000,
      });
      return { status: response.status };
    } catch (err) {
      return { status: 0, error: (err as Error).message };
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

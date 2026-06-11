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

    try {
      const result = await this.dispatch(webhook.url, testPayload, signature);
      return { success: true, statusCode: result.status, webhookId };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        webhookId,
      };
    }
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
      webhooks.map((webhook) => {
        const signature = this.signPayload(webhook.secret, payload);
        return this.dispatch(webhook.url, payload, signature);
      }),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        this.logger.warn(
          `Webhook delivery failed: webhookId=${webhooks[i].id}, error=${result.reason}`,
        );
      } else {
        this.logger.log(
          `Webhook delivered: webhookId=${webhooks[i].id}, status=${result.value.status}`,
        );
      }
    }
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
  ): Promise<{ status: number }> {
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
    } catch {
      return { status: 0 };
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  async handleEvent(eventType: string, data: Record<string, unknown>) {
    this.logger.log(`Processing event: ${eventType}`);

    try {
      await this.webhooksService.dispatchEvent(eventType, data);
    } catch (err) {
      this.logger.error(
        `Failed to dispatch event ${eventType}: ${(err as Error).message}`,
      );
    }
  }
}

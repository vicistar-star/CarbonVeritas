import { Injectable, Logger } from '@nestjs/common';
import { WebhookProcessor } from '../webhooks/webhooks.processor';

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly webhookProcessor: WebhookProcessor) {}

  async emit(type: string, data: Record<string, unknown>) {
    this.logger.log(`Event emitted: ${type}`);

    try {
      await this.webhookProcessor.handleEvent(type, data);
    } catch (err) {
      this.logger.error(
        `Webhook processing failed for event ${type}: ${(err as Error).message}`,
      );
    }
  }
}

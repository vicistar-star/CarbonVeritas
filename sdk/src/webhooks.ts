import { CarbonVeritasClient } from './client';
import type { Webhook, WebhookDelivery } from './types';

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export interface DeliveryFilter {
  eventType?: string;
  limit?: number;
}

export class WebhooksModule {
  constructor(private client: CarbonVeritasClient) {}

  async create(input: CreateWebhookInput): Promise<Webhook> {
    return this.client.post('/webhooks', input);
  }

  async list(): Promise<Webhook[]> {
    return this.client.get('/webhooks');
  }

  async remove(id: string): Promise<Record<string, unknown>> {
    return this.client.delete(`/webhooks/${id}`);
  }

  async test(id: string): Promise<Record<string, unknown>> {
    return this.client.post(`/webhooks/${id}/test`);
  }

  async deliveries(filter: DeliveryFilter = {}): Promise<WebhookDelivery[]> {
    const params: Record<string, unknown> = {};
    if (filter.eventType) params.eventType = filter.eventType;
    if (filter.limit) params.limit = filter.limit;
    return this.client.get('/webhooks/deliveries', params);
  }
}

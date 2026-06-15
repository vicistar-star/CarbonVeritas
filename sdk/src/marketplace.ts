import { CarbonVeritasClient } from './client';
import type {
  Offer,
  Trade,
  MarketplaceStats,
  PricePoint,
  PaginatedResponse,
  MarketplaceFilter,
  CreateOfferInput,
} from './types';

export class MarketplaceModule {
  constructor(private client: CarbonVeritasClient) {}

  async listListings(filters?: MarketplaceFilter): Promise<PaginatedResponse<Offer>> {
    return this.client.get('/marketplace/listings', filters as Record<string, unknown>);
  }

  async getOffer(id: number): Promise<Offer> {
    return this.client.get(`/marketplace/offer/${id}`);
  }

  async createOffer(input: CreateOfferInput): Promise<Offer> {
    return this.client.post('/marketplace/offer', input);
  }

  async buy(offerId: number, amount?: number): Promise<Record<string, unknown>> {
    return this.client.post(`/marketplace/buy/${offerId}`, { amount });
  }

  async cancelOffer(offerId: number): Promise<Record<string, unknown>> {
    return this.client.delete(`/marketplace/offer/${offerId}`);
  }

  async getHistory(): Promise<Trade[]> {
    return this.client.get('/marketplace/history');
  }

  async getPriceHistory(range: '30d' | '90d' | '1y' = '30d'): Promise<{ data: PricePoint[] }> {
    return this.client.get('/marketplace/price-history', { range });
  }

  async getStats(): Promise<MarketplaceStats> {
    return this.client.get('/marketplace/stats');
  }
}

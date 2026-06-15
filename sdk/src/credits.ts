import { CarbonVeritasClient } from './client';
import type {
  Credit,
  PaginatedResponse,
  ProvenanceEvent,
  CreditFilter,
  CreateCreditInput,
  ApproveCreditInput,
  RejectCreditInput,
} from './types';

export class CreditsModule {
  constructor(private client: CarbonVeritasClient) {}

  async list(filters?: CreditFilter): Promise<PaginatedResponse<Credit>> {
    return this.client.get('/credits', filters as Record<string, unknown>);
  }

  async get(id: number): Promise<Credit> {
    return this.client.get(`/credits/${id}`);
  }

  async issue(input: CreateCreditInput): Promise<Credit> {
    return this.client.post('/credits/issue', input);
  }

  async approve(id: number, input?: ApproveCreditInput): Promise<Credit> {
    return this.client.post(`/credits/${id}/approve`, input ?? {});
  }

  async reject(id: number, input: RejectCreditInput): Promise<Credit> {
    return this.client.post(`/credits/${id}/reject`, input);
  }

  async transfer(id: number, to: string): Promise<Credit> {
    return this.client.post(`/credits/${id}/transfer`, { to });
  }

  async getProvenance(id: number): Promise<ProvenanceEvent[]> {
    return this.client.get(`/credits/${id}/provenance`);
  }

  async getOwned(): Promise<Credit[]> {
    return this.client.get('/credits/owned');
  }
}

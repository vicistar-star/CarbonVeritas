import { CarbonVeritasClient } from './client';
import type { Retirement, RetireCreditInput } from './types';

export class RetirementModule {
  constructor(private client: CarbonVeritasClient) {}

  async retire(creditId: number, input: RetireCreditInput): Promise<Retirement> {
    return this.client.post(`/credits/${creditId}/retire`, input);
  }

  async batchRetire(inputs: { creditId: number; input: RetireCreditInput }[]): Promise<Retirement[]> {
    const results: Retirement[] = [];
    for (const { creditId, input } of inputs) {
      const result = await this.retire(creditId, input);
      results.push(result);
    }
    return results;
  }

  async getRecord(creditId: number): Promise<Retirement> {
    return this.client.get(`/credits/${creditId}/retirement`);
  }

  async getCertificate(creditId: number): Promise<Record<string, unknown>> {
    return this.client.get(`/credits/${creditId}/certificate`);
  }
}

import { CarbonVeritasClient } from './client';
import type { ProtocolConfig, SystemStatus } from './types';

export interface UpdateConfigInput {
  verifierThreshold: number;
  verifierQuorum: number;
  approvalWindow: number;
  protocolFeeBps: number;
  bufferPoolPct: number;
}

export class AdminModule {
  constructor(private client: CarbonVeritasClient) {}

  async getProtocolConfig(): Promise<ProtocolConfig> {
    return this.client.get('/admin/config');
  }

  async updateProtocolConfig(input: UpdateConfigInput): Promise<boolean> {
    return this.client.patch('/admin/config', input);
  }

  async getContracts(): Promise<Record<string, string | null>> {
    return this.client.get('/admin/contracts');
  }

  async listVerifiers(): Promise<Record<string, unknown>[]> {
    return this.client.get('/admin/verifiers');
  }

  async addVerifier(address: string): Promise<boolean> {
    return this.client.post('/admin/verifiers', { address });
  }

  async removeVerifier(address: string): Promise<boolean> {
    return this.client.post('/admin/verifiers/remove', { address });
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return this.client.get('/admin/system');
  }
}

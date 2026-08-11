import { CarbonVeritasClient } from './client';
import type {
  ConfigureRevenueSplitInput,
  ConfigureRevenueSplitResult,
  DistributeRevenueSplitInput,
  DistributeRevenueSplitResult,
  RevenueConfig,
} from './types';

/**
 * Project revenue split. Configures beneficiary shares (in basis points)
 * for a project and distributes payments among them, with the protocol fee
 * deducted first. Admin operations require an ADMIN_WALLETS bearer token.
 */
export class RevenueSplitModule {
  constructor(private client: CarbonVeritasClient) {}

  /**
   * Get the revenue-split configuration for a project.
   */
  getConfig(projectId: string): Promise<RevenueConfig> {
    return this.client.get(`/revenue-split/${projectId}/config`);
  }

  /**
   * Configure revenue-split beneficiaries for a project. The sum of all
   * bps shares must be exactly 10000. Admin only.
   */
  configure(
    projectId: string,
    input: ConfigureRevenueSplitInput,
  ): Promise<ConfigureRevenueSplitResult> {
    return this.client.post(`/revenue-split/${projectId}/config`, input);
  }

  /**
   * Distribute a payment among a project's configured beneficiaries.
   */
  distribute(
    projectId: string,
    input: DistributeRevenueSplitInput,
  ): Promise<DistributeRevenueSplitResult> {
    return this.client.post(`/revenue-split/${projectId}/distribute`, input);
  }
}

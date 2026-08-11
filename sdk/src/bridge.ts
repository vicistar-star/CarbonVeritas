import { CarbonVeritasClient } from './client';
import type {
  BridgeInInput,
  BridgeRecord,
  BridgeRecordFilter,
  PaginatedResponse,
  RegistryRoot,
  UpdateRegistryRootInput,
  UpdateRegistryRootResult,
} from './types';

/**
 * Merkle bridge. Imports credits from legacy registries (Verra, Gold
 * Standard, CDM, ACR, CAR, Plan Vivo) onto Stellar with Merkle
 * proof-of-inclusion, returns imported credits to their source registry,
 * and inspects/publishes the on-chain registry merkle roots.
 */
export class BridgeModule {
  constructor(private client: CarbonVeritasClient) {}

  /**
   * List the public bridge audit ledger, optionally filtered by source
   * registry and bridge direction.
   */
  listRecords(filters: BridgeRecordFilter = {}): Promise<PaginatedResponse<BridgeRecord>> {
    const params: Record<string, unknown> = {};
    if (filters.registry) params.registry = filters.registry;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    return this.client.get('/bridge/records', params);
  }

  /**
   * Bridge a credit from a legacy registry onto Stellar using a Merkle
   * inclusion proof against the registry's published root.
   */
  bridgeIn(input: BridgeInInput): Promise<BridgeRecord> {
    return this.client.post('/bridge/in', input);
  }

  /**
   * Bridge a previously imported credit back to its source registry for
   * retirement there. Owner only; the on-chain credit is retired to
   * prevent double-counting.
   */
  bridgeOut(creditId: number): Promise<BridgeRecord> {
    return this.client.post(`/bridge/credits/${creditId}/out`);
  }

  /**
   * Get the currently published merkle root for a legacy registry, along
   * with the on-chain block height and update time.
   */
  getRegistryRoot(registry: string): Promise<RegistryRoot> {
    return this.client.get(`/bridge/registries/${registry}/root`);
  }

  /**
   * Publish a new merkle root for a legacy registry. Requires an admin
   * (ADMIN_WALLETS) bearer token.
   */
  updateRegistryRoot(
    registry: string,
    input: UpdateRegistryRootInput,
  ): Promise<UpdateRegistryRootResult> {
    return this.client.post(`/bridge/registries/${registry}/root`, input);
  }
}

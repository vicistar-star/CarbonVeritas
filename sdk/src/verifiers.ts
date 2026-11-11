import { CarbonVeritasClient } from './client';
import type {
  Credit,
  RegisterVerifierInput,
  Verifier,
  VerifierApproval,
  VerifierProfile,
} from './types';

/**
 * Verifier operations module for registering verifiers, querying status,
 * approvals, pending credits, and maintaining heartbeat.
 */
export class VerifiersModule {
  constructor(private client: CarbonVeritasClient) {}

  /**
   * Register as an on-chain verifier with collateral stake.
   */
  register(input: RegisterVerifierInput): Promise<Verifier> {
    return this.client.post('/verifiers/register', input);
  }

  /**
   * List all registered verifiers ordered by reputation.
   */
  list(): Promise<Verifier[]> {
    return this.client.get('/verifiers');
  }

  /**
   * List credits currently pending verifier review and approval.
   */
  getPendingCredits(): Promise<Credit[]> {
    return this.client.get('/verifiers/pending');
  }

  /**
   * Get verifier details, reputation, and approval statistics by ID.
   */
  get(id: string): Promise<VerifierProfile> {
    return this.client.get(`/verifiers/${id}`);
  }

  /**
   * Get historical approval decisions made by a specific verifier.
   */
  getApprovals(id: string): Promise<VerifierApproval[]> {
    return this.client.get(`/verifiers/${id}/approvals`);
  }

  /**
   * Send a liveness heartbeat for a verifier.
   */
  heartbeat(id: string): Promise<Verifier> {
    return this.client.post(`/verifiers/${id}/heartbeat`, {});
  }
}

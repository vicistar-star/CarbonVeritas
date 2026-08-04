const CONTRACT_ENV_KEYS = [
  'INDEXER_CREDIT_REGISTRY_CONTRACT',
  'INDEXER_MARKETPLACE_CONTRACT',
  'INDEXER_RETIREMENT_TRACKER_CONTRACT',
  'INDEXER_VERIFIER_STAKE_CONTRACT',
  'INDEXER_MERKLE_BRIDGE_CONTRACT',
] as const;

/**
 * Contract addresses the indexer should watch. Without at least one
 * configured contract, Soroban `getEvents` returns nothing and the indexer
 * would silently stay idle, so the empty case is surfaced loudly.
 */
export function contractIds(env: NodeJS.ProcessEnv = process.env): string[] {
  const ids = CONTRACT_ENV_KEYS.map((key) => env[key])
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    console.warn(
      `[Indexer] No ${CONTRACT_ENV_KEYS.join(', ')} set; will not receive events`,
    );
  }

  return ids;
}

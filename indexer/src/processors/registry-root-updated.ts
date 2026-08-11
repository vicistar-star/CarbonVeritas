/**
 * Registry merkle-root rotation published by the MerkleBridge contract.
 *
 * Registry roots are committed on-chain and read back live via the API's
 * `get_registry_root` (they are not persisted in a table), so this processor
 * surfaces each rotation as a structured log line for operators monitoring
 * the bridge's double-minting protection.
 */
export interface RegistryRootUpdatedEvent {
  registry: string;
  root: string;
  ledgerSequence: number;
  txHash: string;
  timestamp: number;
}

export async function processRegistryRootUpdated(
  event: RegistryRootUpdatedEvent,
): Promise<void> {
  console.log(
    `[Indexer] Registry root updated: registry=${event.registry}, root=${event.root}, ledger=${event.ledgerSequence}, tx=${event.txHash}`,
  );
}

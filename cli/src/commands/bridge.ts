import { Command } from 'commander';
import { BridgeModule, CarbonVeritasClient } from '@carbonveritas/sdk';

function getBridgeModule(): BridgeModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new BridgeModule(client);
}

export function registerBridgeCommands(program: Command): void {
  const bridge = program
    .command('bridge')
    .description('Merkle bridge — legacy registry credit imports');

  bridge
    .command('records')
    .description('List the public bridge audit ledger')
    .option('--registry <registry>', 'Filter by source registry (e.g. VERRA)')
    .option('--status <status>', 'Filter by status (INBOUND|OUTBOUND)')
    .option('--page <number>', 'Page number', parseInt, 1)
    .option('--limit <number>', 'Items per page', parseInt, 20)
    .action(async (opts) => {
      try {
        const module = getBridgeModule();
        const result = await module.listRecords({
          registry: opts.registry,
          status: opts.status,
          page: opts.page,
          limit: opts.limit,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  bridge
    .command('in')
    .description('Bridge a credit from a legacy registry onto Stellar with a Merkle proof')
    .requiredOption('--source-registry <registry>', 'Source registry (VERRA|GOLD_STANDARD|CDM|ACR|CAR|PLAN_VIVO)')
    .requiredOption('--source-serial <serial>', 'Serial number on the source registry')
    .requiredOption('--leaf <hash>', 'Merkle leaf hash (64-char hex) of the registry record')
    .requiredOption('--merkle-proof <hashes>', 'Merkle proof sibling hashes (comma-separated)')
    .requiredOption('--merkle-root <hash>', 'Published registry merkle root (64-char hex)')
    .requiredOption('--project-id <id>', 'Project identifier')
    .requiredOption('--methodology <method>', 'Methodology code')
    .requiredOption('--vintage-start <seconds>', 'Vintage start (Unix seconds)', parseInt)
    .requiredOption('--vintage-end <seconds>', 'Vintage end (Unix seconds)', parseInt)
    .requiredOption('--tonnes <n>', 'Tonnes CO2e (in millitonnes)', parseInt)
    .requiredOption('--geography <code>', 'Geography ISO alpha-2 code')
    .requiredOption('--serial-prefix <prefix>', 'Source registry serial prefix')
    .option('--sdg <flags>', 'SDG co-benefit bitmask', parseInt)
    .option('--permanence <rating>', 'Permanence rating (0-100)', parseInt)
    .option('--buffer <pct>', 'Buffer pool contribution %', parseInt)
    .option('--additionality <type>', 'Additionality determination type', parseInt)
    .option('--ipfs <cid>', 'IPFS CID of the MRV documentation bundle')
    .action(async (opts) => {
      try {
        const module = getBridgeModule();
        const result = await module.bridgeIn({
          sourceRegistry: opts.sourceRegistry,
          sourceSerial: opts.sourceSerial,
          leaf: opts.leaf,
          merkleProof: opts.merkleProof.split(','),
          merkleRoot: opts.merkleRoot,
          metadata: {
            projectId: opts.projectId,
            methodology: opts.methodology,
            vintageStart: opts.vintageStart,
            vintageEnd: opts.vintageEnd,
            tonnes: opts.tonnes,
            geography: opts.geography,
            serialPrefix: opts.serialPrefix,
            ...(opts.sdg !== undefined && { sdgFlags: opts.sdg }),
            ...(opts.permanence !== undefined && { permanenceRating: opts.permanence }),
            ...(opts.buffer !== undefined && { bufferContributionPct: opts.buffer }),
            ...(opts.additionality !== undefined && { additionalityType: opts.additionality }),
            ...(opts.ipfs !== undefined && { ipfsHash: opts.ipfs }),
          },
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  bridge
    .command('out <creditId>')
    .description('Bridge a previously imported credit back to its source registry')
    .action(async (creditId: string) => {
      try {
        const module = getBridgeModule();
        const result = await module.bridgeOut(parseInt(creditId, 10));
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  bridge
    .command('root:get <registry>')
    .description('Show the published merkle root for a legacy registry')
    .action(async (registry: string) => {
      try {
        const module = getBridgeModule();
        const result = await module.getRegistryRoot(registry);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  bridge
    .command('root:update <registry>')
    .description('Publish a new merkle root for a legacy registry (admin)')
    .requiredOption('--root <hash>', 'New registry merkle root (64-char hex)')
    .requiredOption('--block-height <n>', 'Ledger height the root was committed at', parseInt)
    .action(async (registry: string, opts: { root: string; blockHeight: number }) => {
      try {
        const module = getBridgeModule();
        const result = await module.updateRegistryRoot(registry, {
          root: opts.root,
          blockHeight: opts.blockHeight,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

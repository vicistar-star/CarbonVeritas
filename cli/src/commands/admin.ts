import { Command } from 'commander';
import { AdminModule, CarbonVeritasClient } from '@carbonveritas/sdk';

function getClient(): CarbonVeritasClient {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return client;
}

export function registerAdminCommands(program: Command): void {
  const admin = program.command('admin').description('Protocol administration');

  admin
    .command('config')
    .description('Show on-chain protocol config')
    .action(async () => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.getProtocolConfig();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('config:update')
    .description('Update on-chain protocol config')
    .requiredOption('--verifier-threshold <n>', 'Verifier threshold', parseInt)
    .requiredOption('--verifier-quorum <n>', 'Verifier quorum', parseInt)
    .requiredOption('--approval-window <seconds>', 'Approval window in seconds', parseInt)
    .requiredOption('--protocol-fee-bps <bps>', 'Protocol fee in basis points', parseInt)
    .requiredOption('--buffer-pool-pct <pct>', 'Buffer pool percentage', parseInt)
    .action(async (opts) => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.updateProtocolConfig({
          verifierThreshold: opts.verifierThreshold,
          verifierQuorum: opts.verifierQuorum,
          approvalWindow: opts.approvalWindow,
          protocolFeeBps: opts.protocolFeeBps,
          bufferPoolPct: opts.bufferPoolPct,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('contracts')
    .description('List deployed contract addresses')
    .action(async () => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.getContracts();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('verifiers')
    .description('List registered verifiers')
    .action(async () => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.listVerifiers();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('verifiers:add <address>')
    .description('Add a verifier to the approval registry')
    .action(async (address: string) => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.addVerifier(address);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('verifiers:remove <address>')
    .description('Remove a verifier from the approval registry')
    .action(async (address: string) => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.removeVerifier(address);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  admin
    .command('system')
    .description('Show system status and entity counts')
    .action(async () => {
      try {
        const module = new AdminModule(getClient());
        const result = await module.getSystemStatus();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

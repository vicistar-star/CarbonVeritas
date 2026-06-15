import { Command } from 'commander';
import { CarbonVeritasClient, CreditsModule } from '@carbonveritas/sdk';

function getCreditsModule(): CreditsModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new CreditsModule(client);
}

export function registerVerifyCommands(program: Command): void {
  const verify = program.command('verify').description('Verifier operations');

  verify
    .command('register')
    .description('Register as a verifier')
    .requiredOption('--stake <amount>', 'Minimum stake amount', parseFloat)
    .option('--credentials <url>', 'URL to credentials documentation')
    .action(async (opts) => {
      try {
        const client = new CarbonVeritasClient({
          apiUrl: process.env.CV_API_URL,
          network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
        });
        const token = process.env.CV_AUTH_TOKEN;
        if (token) client.setAuthToken(token);
        const result = await client.post('/verifiers/register', {
          stake: opts.stake,
          credentials: opts.credentials,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('status [address]')
    .description('Check verifier status (yours or by address)')
    .action(async (address?: string) => {
      try {
        const client = new CarbonVeritasClient({
          apiUrl: process.env.CV_API_URL,
          network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
        });
        const token = process.env.CV_AUTH_TOKEN;
        if (token) client.setAuthToken(token);
        const path = address ? `/verifiers/${address}` : '/verifiers';
        const result = await client.get(path);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('approve <credit-id>')
    .description('Approve a credit as a verifier')
    .option('--comments <text>', 'Approval comments')
    .action(async (creditId: string, opts) => {
      const mod = getCreditsModule();
      try {
        const result = await mod.approve(parseInt(creditId, 10), { comments: opts.comments });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('reject <credit-id>')
    .description('Reject a credit as a verifier')
    .requiredOption('--reason <text>', 'Rejection reason')
    .action(async (creditId: string, opts) => {
      const mod = getCreditsModule();
      try {
        const result = await mod.reject(parseInt(creditId, 10), { reason: opts.reason });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('heartbeat')
    .description('Send liveness heartbeat as a verifier')
    .action(async () => {
      try {
        const client = new CarbonVeritasClient({
          apiUrl: process.env.CV_API_URL,
          network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
        });
        const token = process.env.CV_AUTH_TOKEN;
        if (token) client.setAuthToken(token);
        const result = await client.post('/verifiers/heartbeat');
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

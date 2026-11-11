import { Command } from 'commander';
import { CarbonVeritasSDK } from '@carbonveritas/sdk';

function getSdk(): CarbonVeritasSDK {
  const sdk = new CarbonVeritasSDK({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) sdk.client.setAuthToken(token);
  return sdk;
}

export function registerVerifyCommands(program: Command): void {
  const verify = program.command('verify').description('Verifier operations');

  verify
    .command('register')
    .description('Register as a verifier with stake')
    .requiredOption('--stake <amount>', 'Minimum stake amount', parseFloat)
    .option('--credentials <url>', 'URL to credentials documentation')
    .action(async (opts) => {
      try {
        const sdk = getSdk();
        const result = await sdk.verifiers.register({
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
    .command('status [id]')
    .description('Check verifier status (all verifiers or by verifier id)')
    .action(async (id?: string) => {
      try {
        const sdk = getSdk();
        const result = id ? await sdk.verifiers.get(id) : await sdk.verifiers.list();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('pending')
    .description('List credits pending verifier review')
    .action(async () => {
      try {
        const sdk = getSdk();
        const result = await sdk.verifiers.getPendingCredits();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('approvals <id>')
    .description('List historical approvals for a verifier id')
    .action(async (id: string) => {
      try {
        const sdk = getSdk();
        const result = await sdk.verifiers.getApprovals(id);
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
      try {
        const sdk = getSdk();
        const result = await sdk.credits.approve(parseInt(creditId, 10), { comments: opts.comments });
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
      try {
        const sdk = getSdk();
        const result = await sdk.credits.reject(parseInt(creditId, 10), { reason: opts.reason });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  verify
    .command('heartbeat <id>')
    .description('Send liveness heartbeat for a verifier')
    .action(async (id: string) => {
      try {
        const sdk = getSdk();
        const result = await sdk.verifiers.heartbeat(id);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

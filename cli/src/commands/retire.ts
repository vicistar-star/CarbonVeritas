import { Command } from 'commander';
import { CarbonVeritasClient, RetirementModule } from '@carbonveritas/sdk';

function getRetirementModule(): RetirementModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new RetirementModule(client);
}

export function registerRetireCommands(program: Command): void {
  const retire = program.command('retire').description('Retire carbon credits');

  retire
    .command('retire <credit-id>')
    .description('Retire a single credit')
    .requiredOption('--reason <text>', 'Reason for retirement')
    .requiredOption('--beneficiary <address>', 'Beneficiary Stellar address')
    .requiredOption('--period <period>', 'Accounting period (e.g. 2024-Q1)')
    .option('--tonnes <amount>', 'Tonnes to retire (defaults to full)', parseFloat)
    .action(async (creditId: string, opts) => {
      const mod = getRetirementModule();
      try {
        const result = await mod.retire(parseInt(creditId, 10), {
          reason: opts.reason,
          beneficiary: opts.beneficiary,
          accountingPeriod: opts.period,
          tonnesRetired: opts.tonnes ? String(opts.tonnes) : undefined,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  retire
    .command('batch-retire')
    .description('Retire multiple credits at once')
    .requiredOption('--credits <csv>', 'Comma-separated credit IDs')
    .requiredOption('--reason <text>', 'Reason for retirement')
    .requiredOption('--beneficiary <address>', 'Beneficiary Stellar address')
    .requiredOption('--period <period>', 'Accounting period')
    .action(async (opts) => {
      const mod = getRetirementModule();
      const creditIds = opts.credits.split(',').map(Number);
      const inputs = creditIds.map((creditId: number) => ({
        creditId,
        input: {
          reason: opts.reason,
          beneficiary: opts.beneficiary,
          accountingPeriod: opts.period,
        },
      }));
      try {
        const results = await mod.batchRetire(inputs);
        console.log(JSON.stringify(results, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  retire
    .command('status <credit-id>')
    .description('Check retirement status of a credit')
    .action(async (creditId: string) => {
      const mod = getRetirementModule();
      try {
        const record = await mod.getRecord(parseInt(creditId, 10));
        console.log(JSON.stringify(record, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  retire
    .command('certificate <credit-id>')
    .description('Get retirement certificate for a credit')
    .action(async (creditId: string) => {
      const mod = getRetirementModule();
      try {
        const cert = await mod.getCertificate(parseInt(creditId, 10));
        console.log(JSON.stringify(cert, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

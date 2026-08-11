import { Command } from 'commander';
import { CarbonVeritasClient, RevenueSplitModule } from '@carbonveritas/sdk';

function getRevenueSplitModule(): RevenueSplitModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new RevenueSplitModule(client);
}

export function registerRevenueSplitCommands(program: Command): void {
  const revenueSplit = program
    .command('revenue-split')
    .description('Project revenue split management');

  revenueSplit
    .command('config <projectId>')
    .description('Show the revenue-split configuration for a project')
    .action(async (projectId: string) => {
      try {
        const module = getRevenueSplitModule();
        const result = await module.getConfig(projectId);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  revenueSplit
    .command('configure <projectId>')
    .description('Configure revenue-split beneficiaries (admin; shares must sum to 10000)')
    .option('--beneficiaries <addr:bps,...>', 'Comma-separated beneficiary shares, e.g. GAAA:6000,GBBB:4000')
    .action(
      async (
        projectId: string,
        opts: { beneficiaries?: string },
      ) => {
        try {
          if (!opts.beneficiaries) {
            throw new Error('--beneficiaries is required (e.g. GAAA:6000,GBBB:4000)');
          }
          const beneficiaries = opts.beneficiaries.split(',').map((entry) => {
            const [address, bpsRaw] = entry.trim().split(':');
            const bps = Number(bpsRaw);
            if (!address || !Number.isInteger(bps)) {
              throw new Error(`Invalid beneficiary entry: ${entry}`);
            }
            return { address, bps };
          });
          const module = getRevenueSplitModule();
          const result = await module.configure(projectId, { beneficiaries });
          console.log(JSON.stringify(result, null, 2));
        } catch (err: unknown) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      },
    );

  revenueSplit
    .command('distribute <projectId>')
    .description('Distribute a payment among a project\u2019s beneficiaries')
    .requiredOption('--asset <address>', 'Payment asset Stellar address')
    .requiredOption('--amount <n>', 'Amount in the asset smallest unit', parseInt)
    .action(
      async (
        projectId: string,
        opts: { asset: string; amount: number },
      ) => {
        try {
          const module = getRevenueSplitModule();
          const result = await module.distribute(projectId, {
            asset: opts.asset,
            amount: opts.amount,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (err: unknown) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      },
    );
}

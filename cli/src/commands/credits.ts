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

export function registerCreditsCommands(program: Command): void {
  const credits = program.command('credits').description('Manage carbon credits');

  credits
    .command('list')
    .description('List credits with optional filters')
    .option('--status <status>', 'Filter by status (PENDING|ACTIVE|RETIRED|REJECTED|BRIDGED)')
    .option('--methodology <methodology>', 'Filter by methodology')
    .option('--geography <geography>', 'Filter by geography (ISO alpha-2)')
    .option('--vintage-min <year>', 'Minimum vintage year', parseInt)
    .option('--vintage-max <year>', 'Maximum vintage year', parseInt)
    .option('--issuer <address>', 'Filter by issuer Stellar address')
    .option('--owner <address>', 'Filter by owner Stellar address')
    .option('--page <number>', 'Page number', parseInt, 1)
    .option('--limit <number>', 'Items per page', parseInt, 20)
    .option('--sort <field>', 'Sort field')
    .action(async (opts) => {
      const mod = getCreditsModule();
      try {
        const { data, meta } = await mod.list(opts);
        console.log(JSON.stringify({ data, meta }, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  credits
    .command('get <id>')
    .description('Get a single credit by ID')
    .action(async (id: string) => {
      const mod = getCreditsModule();
      try {
        const credit = await mod.get(parseInt(id, 10));
        console.log(JSON.stringify(credit, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  credits
    .command('issue')
    .description('Submit a new carbon credit')
    .requiredOption('--project-id <id>', 'Project identifier')
    .requiredOption('--methodology <method>', 'Methodology standard')
    .requiredOption('--vintage-start <date>', 'Vintage start date (ISO 8601)')
    .requiredOption('--vintage-end <date>', 'Vintage end date (ISO 8601)')
    .requiredOption('--tonnes <number>', 'Number of tonnes', parseFloat)
    .requiredOption('--geography <code>', 'Geography ISO alpha-2 code')
    .option('--sdg <numbers>', 'SDG co-benefits (comma-separated)')
    .option('--permanence <rating>', 'Permanence rating (0-100)', parseInt)
    .option('--buffer <pct>', 'Buffer contribution %', parseInt)
    .option('--additionality <type>', 'Additionality type (0-2)', parseInt)
    .action(async (opts) => {
      const mod = getCreditsModule();
      try {
        const credit = await mod.issue({
          projectId: opts.projectId,
          methodology: opts.methodology,
          vintageStart: opts.vintageStart,
          vintageEnd: opts.vintageEnd,
          tonnes: opts.tonnes,
          geography: opts.geography,
          sdgCobenefits: opts.sdg ? opts.sdg.split(',').map(Number) : undefined,
          permanenceRating: opts.permanence,
          bufferContributionPct: opts.buffer,
          additionalityType: opts.additionality,
        });
        console.log(JSON.stringify(credit, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  credits
    .command('approve <id>')
    .description('Approve a pending credit')
    .option('--comments <text>', 'Approval comments')
    .action(async (id: string, opts) => {
      const mod = getCreditsModule();
      try {
        const credit = await mod.approve(parseInt(id, 10), { comments: opts.comments });
        console.log(JSON.stringify(credit, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  credits
    .command('reject <id>')
    .description('Reject a pending credit')
    .requiredOption('--reason <text>', 'Rejection reason')
    .action(async (id: string, opts) => {
      const mod = getCreditsModule();
      try {
        const credit = await mod.reject(parseInt(id, 10), { reason: opts.reason });
        console.log(JSON.stringify(credit, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  credits
    .command('transfer <id>')
    .description('Transfer credit ownership')
    .requiredOption('--to <address>', 'New owner Stellar address')
    .action(async (id: string, opts) => {
      const mod = getCreditsModule();
      try {
        const credit = await mod.transfer(parseInt(id, 10), opts.to);
        console.log(JSON.stringify(credit, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

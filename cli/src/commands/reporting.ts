import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { CarbonVeritasClient, ReportingModule } from '@carbonveritas/sdk';

function getReportingModule(): ReportingModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new ReportingModule(client);
}

export function registerReportingCommands(program: Command): void {
  const reporting = program
    .command('reporting')
    .description('Sustainability reporting exports');

  reporting
    .command('scope3 [year]')
    .description('Export your retired credits as a GHG Protocol Scope 3 inventory')
    .option('--csv', 'Export as CSV instead of JSON')
    .option('-o, --output <file>', 'Write CSV output to a file instead of stdout')
    .action(async (year?: string, opts?: { csv?: boolean; output?: string }) => {
      try {
        const query = year
          ? { year: parseInt(year, 10) }
          : undefined;
        const module = getReportingModule();

        if (opts?.csv) {
          const csv = await module.downloadScope3Csv(query);
          if (opts.output) {
            writeFileSync(opts.output, csv, 'utf-8');
            console.log(`Wrote scope 3 CSV to ${opts.output}`);
          } else {
            process.stdout.write(csv);
          }
          return;
        }

        const report = await module.getScope3Report(query);
        console.log(JSON.stringify(report, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

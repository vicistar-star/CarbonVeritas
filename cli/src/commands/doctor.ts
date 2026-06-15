import { Command } from 'commander';
import { CarbonVeritasClient } from '@carbonveritas/sdk';

interface CheckResult {
  name: string;
  status: 'ok' | 'fail';
  detail?: string;
}

function getClient(): CarbonVeritasClient {
  return new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Run health checks on the CarbonVeritas stack')
    .action(async () => {
      const results: CheckResult[] = [];
      const client = getClient();

      console.log('Running CarbonVeritas health checks...\n');

      // API health check
      try {
        const health = await client.health();
        results.push({
          name: 'API',
          status: 'ok',
          detail: `${health.status} v${health.version} (${health.network})`,
        });
      } catch (err: unknown) {
        results.push({
          name: 'API',
          status: 'fail',
          detail: (err as Error).message,
        });
      }

      // List credits check
      try {
        const { meta } = await client.get('/credits?limit=1');
        results.push({
          name: 'Database',
          status: 'ok',
          detail: `${meta.total} credits indexed`,
        });
      } catch (err: unknown) {
        results.push({
          name: 'Database',
          status: 'fail',
          detail: (err as Error).message,
        });
      }

      // Auth challenge check
      try {
        await client.post('/auth/challenge', { wallet: 'TEST' });
        results.push({ name: 'Auth Service', status: 'ok' });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg.includes('400') || msg.includes('401')) {
          results.push({ name: 'Auth Service', status: 'ok', detail: 'Challenge endpoint reachable' });
        } else {
          results.push({ name: 'Auth Service', status: 'fail', detail: msg });
        }
      }

      // Network check
      const network = process.env.CV_NETWORK || 'testnet';
      results.push({
        name: 'Network Config',
        status: 'ok',
        detail: `Configured for ${network}`,
      });

      // Print results
      let allOk = true;
      for (const r of results) {
        const icon = r.status === 'ok' ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${r.name}: ${r.status}${r.detail ? ' — ' + r.detail : ''}`);
        if (r.status === 'fail') allOk = false;
      }

      console.log(allOk ? '\nAll checks passed.' : '\nSome checks failed.');
      process.exit(allOk ? 0 : 1);
    });
}

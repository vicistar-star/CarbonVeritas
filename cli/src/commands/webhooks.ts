import { Command } from 'commander';
import { CarbonVeritasClient, WebhooksModule } from '@carbonveritas/sdk';

function getClient(): CarbonVeritasClient {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return client;
}

export function registerWebhookCommands(program: Command): void {
  const webhooks = program.command('webhooks').description('Webhook management');

  webhooks
    .command('create <url>')
    .description('Register a webhook endpoint')
    .requiredOption('--events <list>', 'Comma-separated event types, e.g. credit.retired,offer.filled', (value: string) =>
      value.split(',').map((s) => s.trim()).filter(Boolean),
    )
    .action(async (url: string, opts) => {
      try {
        const module = new WebhooksModule(getClient());
        const result = await module.create({ url, events: opts.events });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  webhooks
    .command('list')
    .description('List registered webhooks')
    .action(async () => {
      try {
        const module = new WebhooksModule(getClient());
        const result = await module.list();
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  webhooks
    .command('test <id>')
    .description('Send a test payload to a webhook')
    .action(async (id: string) => {
      try {
        const module = new WebhooksModule(getClient());
        const result = await module.test(id);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  webhooks
    .command('deliveries')
    .description('List webhook delivery attempts')
    .option('--event-type <type>', 'Filter by event type')
    .option('--limit <n>', 'Maximum number of deliveries', parseInt)
    .action(async (opts) => {
      try {
        const module = new WebhooksModule(getClient());
        const result = await module.deliveries({
          eventType: opts.eventType,
          limit: opts.limit,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  webhooks
    .command('delete <id>')
    .description('Remove a webhook')
    .action(async (id: string) => {
      try {
        const module = new WebhooksModule(getClient());
        const result = await module.remove(id);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

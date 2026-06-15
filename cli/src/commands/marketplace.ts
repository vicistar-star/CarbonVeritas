import { Command } from 'commander';
import { CarbonVeritasClient, MarketplaceModule } from '@carbonveritas/sdk';

function getMarketplaceModule(): MarketplaceModule {
  const client = new CarbonVeritasClient({
    apiUrl: process.env.CV_API_URL,
    network: process.env.CV_NETWORK as 'testnet' | 'mainnet' | 'futurenet',
  });
  const token = process.env.CV_AUTH_TOKEN;
  if (token) client.setAuthToken(token);
  return new MarketplaceModule(client);
}

export function registerMarketplaceCommands(program: Command): void {
  const marketplace = program.command('marketplace').description('Marketplace operations');

  marketplace
    .command('listings')
    .description('List marketplace listings')
    .option('--methodology <methodology>', 'Filter by methodology')
    .option('--geography <geography>', 'Filter by geography')
    .option('--max-price <price>', 'Maximum price per tonne', parseFloat)
    .option('--status <status>', 'Filter by status')
    .option('--page <number>', 'Page number', parseInt, 1)
    .option('--limit <number>', 'Items per page', parseInt, 20)
    .action(async (opts) => {
      const mod = getMarketplaceModule();
      try {
        const result = await mod.listListings(opts);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command('offer <id>')
    .description('Get a specific offer')
    .action(async (id: string) => {
      const mod = getMarketplaceModule();
      try {
        const offer = await mod.getOffer(parseInt(id, 10));
        console.log(JSON.stringify(offer, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command('create-offer')
    .description('Create a sell offer')
    .requiredOption('--credit-id <id>', 'Credit ID', parseInt)
    .requiredOption('--price <price>', 'Price per tonne', parseFloat)
    .requiredOption('--amount <amount>', 'Tonnes to sell', parseFloat)
    .requiredOption('--currency <code>', 'Currency (e.g. USDC)')
    .option('--expires-at <timestamp>', 'Expiry Unix timestamp (ms)', parseInt)
    .action(async (opts) => {
      const mod = getMarketplaceModule();
      try {
        const offer = await mod.createOffer({
          creditId: opts.creditId,
          pricePerTonne: opts.price,
          amount: opts.amount,
          currency: opts.currency,
          expiresAt: opts.expiresAt,
        });
        console.log(JSON.stringify(offer, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command('buy <offer-id>')
    .description('Buy credits from an offer')
    .option('--amount <amount>', 'Tonnes to buy (defaults to full amount)', parseFloat)
    .action(async (offerId: string, opts) => {
      const mod = getMarketplaceModule();
      try {
        const result = await mod.buy(parseInt(offerId, 10), opts.amount);
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command('cancel <offer-id>')
    .description('Cancel an active offer')
    .action(async (offerId: string) => {
      const mod = getMarketplaceModule();
      try {
        const result = await mod.cancelOffer(parseInt(offerId, 10));
        console.log(JSON.stringify(result, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command('history')
    .description('View your trade history')
    .action(async () => {
      const mod = getMarketplaceModule();
      try {
        const trades = await mod.getHistory();
        console.log(JSON.stringify(trades, null, 2));
      } catch (err: unknown) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
    });
}

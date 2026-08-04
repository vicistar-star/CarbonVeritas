#!/usr/bin/env node
import { Command } from 'commander';
import { registerCreditsCommands } from './commands/credits';
import { registerMarketplaceCommands } from './commands/marketplace';
import { registerRetireCommands } from './commands/retire';
import { registerVerifyCommands } from './commands/verify';
import { registerDoctorCommand } from './commands/doctor';
import { registerWebhookCommands } from './commands/webhooks';
import { registerAdminCommands } from './commands/admin';

const program = new Command();

program
  .name('cv')
  .description('CarbonVeritas CLI — carbon credit protocol tool')
  .version('0.1.0')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--network <network>', 'Stellar network (testnet|mainnet|futurenet)', 'testnet')
  .option('--wallet <key>', 'Stellar public key')
  .hook('preAction', (thisCmd) => {
    const opts = thisCmd.optsWithGlobals();
    process.env.CV_API_URL = opts.apiUrl;
    process.env.CV_NETWORK = opts.network;
    if (opts.wallet) process.env.CV_WALLET = opts.wallet;
  });

registerCreditsCommands(program);
registerMarketplaceCommands(program);
registerRetireCommands(program);
registerVerifyCommands(program);
registerDoctorCommand(program);
registerWebhookCommands(program);
registerAdminCommands(program);

program.parse(process.argv);

import { Command } from 'commander';
import { registerVerifyCommands } from '../src/commands/verify';
import { registerCreditsCommands } from '../src/commands/credits';
import { registerMarketplaceCommands } from '../src/commands/marketplace';
import { registerRetireCommands } from '../src/commands/retire';
import { registerDoctorCommand } from '../src/commands/doctor';
import { registerWebhookCommands } from '../src/commands/webhooks';
import { registerAdminCommands } from '../src/commands/admin';
import { registerReportingCommands } from '../src/commands/reporting';
import { registerBridgeCommands } from '../src/commands/bridge';
import { registerRevenueSplitCommands } from '../src/commands/revenue-split';

describe('CLI Commands Registration', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
  });

  it('registers verify command and all its subcommands', () => {
    registerVerifyCommands(program);

    const verify = program.commands.find((c) => c.name() === 'verify');
    expect(verify).toBeDefined();

    const subcommands = verify!.commands.map((c) => c.name());
    expect(subcommands).toContain('register');
    expect(subcommands).toContain('status');
    expect(subcommands).toContain('pending');
    expect(subcommands).toContain('approvals');
    expect(subcommands).toContain('approve');
    expect(subcommands).toContain('reject');
    expect(subcommands).toContain('heartbeat');
  });

  it('registers credits command and subcommands', () => {
    registerCreditsCommands(program);

    const credits = program.commands.find((c) => c.name() === 'credits');
    expect(credits).toBeDefined();

    const subcommands = credits!.commands.map((c) => c.name());
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('get');
    expect(subcommands).toContain('issue');
    expect(subcommands).toContain('approve');
    expect(subcommands).toContain('reject');
    expect(subcommands).toContain('transfer');
  });

  it('registers marketplace command and subcommands', () => {
    registerMarketplaceCommands(program);

    const mp = program.commands.find((c) => c.name() === 'marketplace');
    expect(mp).toBeDefined();

    const subcommands = mp!.commands.map((c) => c.name());
    expect(subcommands).toContain('listings');
    expect(subcommands).toContain('create-offer');
    expect(subcommands).toContain('buy');
    expect(subcommands).toContain('cancel');
  });

  it('registers revenue-split command and subcommands', () => {
    registerRevenueSplitCommands(program);

    const rs = program.commands.find((c) => c.name() === 'revenue-split');
    expect(rs).toBeDefined();

    const subcommands = rs!.commands.map((c) => c.name());
    expect(subcommands).toContain('config');
    expect(subcommands).toContain('configure');
    expect(subcommands).toContain('distribute');
  });

  it('registers bridge command and subcommands', () => {
    registerBridgeCommands(program);

    const bridge = program.commands.find((c) => c.name() === 'bridge');
    expect(bridge).toBeDefined();

    const subcommands = bridge!.commands.map((c) => c.name());
    expect(subcommands).toContain('records');
    expect(subcommands).toContain('in');
    expect(subcommands).toContain('out');
    expect(subcommands).toContain('root:get');
    expect(subcommands).toContain('root:update');
  });

  it('registers retire, doctor, webhooks, admin, and reporting commands', () => {
    registerRetireCommands(program);
    registerDoctorCommand(program);
    registerWebhookCommands(program);
    registerAdminCommands(program);
    registerReportingCommands(program);

    const names = program.commands.map((c) => c.name());
    expect(names).toContain('retire');
    expect(names).toContain('doctor');
    expect(names).toContain('webhooks');
    expect(names).toContain('admin');
    expect(names).toContain('reporting');
  });
});

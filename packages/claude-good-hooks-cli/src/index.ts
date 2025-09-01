#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { listHooks } from './commands/list-hooks.js';
import { remoteCommand } from './commands/remote.js';
import { applyCommand } from './commands/apply.js';
import { updateCommand } from './commands/update.js';
import { doctorCommand } from './commands/doctor.js';
import { versionCommand } from './commands/version.js';
import { helpCommand } from './commands/help.js';

const program = new Command();

program
  .name('claude-good-hooks')
  .description('CLI for managing Claude Code hooks')
  .version('1.0.0')
  .option('--json', 'Output in JSON format');

program
  .command('help')
  .description('Show help information')
  .action(helpCommand);

program
  .command('list-hooks')
  .description('List available hooks')
  .option('--installed', 'Show only installed hooks')
  .option('--project', 'Show project-level hooks (default)')
  .option('--global', 'Show global hooks')
  .action(listHooks);

program
  .command('remote')
  .description('Manage remote hook sources')
  .option('--add <module>', 'Add a remote hook module')
  .option('--remove <module>', 'Remove a remote hook module')
  .action(remoteCommand);

program
  .command('apply')
  .description('Apply a hook')
  .option('--global', 'Apply globally')
  .option('--project', 'Apply to project (default)')
  .option('--local', 'Apply locally (settings.local.json)')
  .option('--help', 'Show hook-specific help')
  .argument('<hook-name>', 'Name of the hook to apply')
  .argument('[args...]', 'Hook-specific arguments')
  .action(applyCommand);

program
  .command('update')
  .description('Update claude-good-hooks CLI')
  .action(updateCommand);

program
  .command('doctor')
  .description('Check system configuration')
  .action(doctorCommand);

program
  .command('version')
  .description('Show version information')
  .action(versionCommand);

program.parse();
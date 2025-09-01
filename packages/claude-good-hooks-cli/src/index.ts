#!/usr/bin/env node

import { parseCliArgs, createOptionsWithParent } from './utils/cli-parser.js';
import { Container } from './container/index.js';
import { listHooks } from './commands/list-hooks.js';
import { remoteCommand } from './commands/remote.js';
import { applyCommand } from './commands/apply.js';
import { updateCommand } from './commands/update.js';
import { doctorCommand } from './commands/doctor.js';
import { versionCommand } from './commands/version.js';
import { helpCommand } from './commands/help.js';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';

async function main(): Promise<void> {
  // Create dependency injection container
  const container = new Container();
  
  const parsed = parseCliArgs(process.argv);
  const { command, args, options, globalOptions } = parsed;
  
  // Create options object with parent reference for compatibility
  const commandOptions = createOptionsWithParent(options, globalOptions);

  try {
    switch (command) {
      case 'help':
        await helpCommand(container, commandOptions);
        break;
        
      case 'init':
        // New init command - doesn't use container yet
        await initCommand(commandOptions);
        break;
        
      case 'list-hooks':
        await listHooks(container, commandOptions);
        break;
        
      case 'remote':
        await remoteCommand(container, commandOptions);
        break;
        
      case 'apply':
        if (args.length === 0) {
          console.error('Error: Missing required argument: hook-name');
          console.error('Run "claude-good-hooks help apply" for usage information.');
          process.exit(1);
        }
        const [hookName, ...hookArgs] = args;
        if (!hookName) {
          console.error('Error: Hook name is required');
          process.exit(1);
        }
        await applyCommand(container, hookName, hookArgs, commandOptions);
        break;
        
      case 'validate':
        // New validate command - doesn't use container yet
        await validateCommand(commandOptions);
        break;
        
      case 'export':
        // New export command - doesn't use container yet
        await exportCommand(commandOptions);
        break;
        
      case 'import':
        if (args.length === 0) {
          console.error('Error: Missing required argument: source');
          console.error('Run "claude-good-hooks help import" for usage information.');
          process.exit(1);
        }
        const [source, ...importArgs] = args;
        if (!source) {
          console.error('Error: Source is required');
          process.exit(1);
        }
        // New import command - doesn't use container yet
        await importCommand(source, { ...commandOptions, source });
        break;
        
      case 'update':
        await updateCommand(container, commandOptions);
        break;
        
      case 'doctor':
        await doctorCommand(commandOptions);
        break;
        
      case 'version':
        await versionCommand(container, commandOptions);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "claude-good-hooks help" for available commands.');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
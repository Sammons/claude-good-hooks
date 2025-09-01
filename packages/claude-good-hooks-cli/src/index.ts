#!/usr/bin/env node

import { parseCliArgs, createOptionsWithParent } from './utils/cli-parser.js';
import { listHooks } from './commands/list-hooks.js';
import { remoteCommand } from './commands/remote.js';
import { applyCommand } from './commands/apply.js';
import { updateCommand } from './commands/update.js';
import { doctorCommand } from './commands/doctor.js';
import { versionCommand } from './commands/version.js';
import { helpCommand } from './commands/help.js';

async function main(): Promise<void> {
  const parsed = parseCliArgs(process.argv);
  const { command, args, options, globalOptions } = parsed;
  
  // Create options object with parent reference for compatibility
  const commandOptions = createOptionsWithParent(options, globalOptions);

  try {
    switch (command) {
      case 'help':
        await helpCommand(commandOptions);
        break;
        
      case 'list-hooks':
        await listHooks(commandOptions);
        break;
        
      case 'remote':
        await remoteCommand(commandOptions);
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
        await applyCommand(hookName, hookArgs, commandOptions);
        break;
        
      case 'update':
        await updateCommand(commandOptions);
        break;
        
      case 'doctor':
        await doctorCommand(commandOptions);
        break;
        
      case 'version':
        await versionCommand(commandOptions);
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

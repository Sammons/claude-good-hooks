#!/usr/bin/env node

import { parseCliArgs, createOptionsWithParent } from './helpers/cli-parser-helper.js';
import { CommandRegistry } from './commands/command-registry.js';

async function main(): Promise<void> {
  const parsed = parseCliArgs(process.argv);
  const { command, args, options, globalOptions } = parsed;

  // Create options object with parent reference for compatibility
  const commandOptions = createOptionsWithParent(options, globalOptions);

  // Create command registry
  const commandRegistry = new CommandRegistry();

  try {
    // Try to find a class-based command
    const commandInstance = commandRegistry.findCommand(command);

    if (commandInstance) {
      // Validate the command arguments
      const validationResult = commandInstance.validate(args, commandOptions);

      if (typeof validationResult === 'object' && !validationResult.valid) {
        console.error('Error: Invalid command arguments');
        if (validationResult.error) {
          console.error(`  ${validationResult.error}`);
        }
        process.exit(1);
      }

      // Execute the command
      await commandInstance.execute(args, commandOptions);
      return;
    }

    // No command found
    console.error(`Unknown command: ${command}`);
    console.error('Run "claude-good-hooks help" for available commands.');
    process.exit(1);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

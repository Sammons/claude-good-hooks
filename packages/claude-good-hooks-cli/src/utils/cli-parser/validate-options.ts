import { parseArgs } from 'node:util';
import { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class ValidateOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'validate';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          scope: { type: 'string' },
          'test-commands': { type: 'boolean' },
          'check-paths': { type: 'boolean' },
          verbose: { type: 'boolean' },
          fix: { type: 'boolean' },
          migrate: { type: 'boolean' },
          help: { type: 'boolean' },
        },
        allowPositionals: false,
        strict: false
      });

      // Convert kebab-case to camelCase
      const options: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed.values)) {
        if (key === 'test-commands') {
          options.testCommands = value;
        } else if (key === 'check-paths') {
          options.checkPaths = value;
        } else {
          options[key] = value;
        }
      }

      return {
        args: [],
        options
      };
    } catch {
      return { args, options: {} };
    }
  }
}
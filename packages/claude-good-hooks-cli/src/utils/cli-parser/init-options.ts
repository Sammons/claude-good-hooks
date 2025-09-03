import { parseArgs } from 'node:util';
import { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class InitOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'init';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          force: { type: 'boolean' },
          scope: { type: 'string' },
          template: { type: 'string' },
          yes: { type: 'boolean' },
        },
        allowPositionals: false,
        strict: false
      });

      return {
        args: [],
        options: parsed.values
      };
    } catch {
      return { args, options: {} };
    }
  }
}
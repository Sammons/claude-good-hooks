import { parseArgs } from 'node:util';
import { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class ListHooksOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'list-hooks';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          installed: { type: 'boolean' },
          project: { type: 'boolean' },
          global: { type: 'boolean' },
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
import { parseArgs } from 'node:util';
import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class UpdateOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'update';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          help: { type: 'boolean' },
          json: { type: 'boolean' },
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
import { parseArgs } from 'node:util';
import { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class RemoteOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'remote';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          add: { type: 'string' },
          remove: { type: 'string' },
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
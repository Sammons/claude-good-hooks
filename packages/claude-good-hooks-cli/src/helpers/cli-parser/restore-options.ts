import { parseArgs } from 'node:util';
import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class RestoreOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'restore';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          latest: { type: 'boolean' },
          scope: { type: 'string' },
          force: { type: 'boolean' },
          yes: { type: 'boolean' },
          help: { type: 'boolean' },
        },
        allowPositionals: true,
        strict: false
      });

      return {
        args: parsed.positionals,
        options: parsed.values as Record<string, unknown>
      };
    } catch {
      return { args, options: {} };
    }
  }
}
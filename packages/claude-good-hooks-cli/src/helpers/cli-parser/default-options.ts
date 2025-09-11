import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class DefaultOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    // Match commands that don't need special option processing
    return ['help', 'version'].includes(command);
  }

  process(args: string[]): CommandOptionResult {
    return { args, options: {} };
  }
}

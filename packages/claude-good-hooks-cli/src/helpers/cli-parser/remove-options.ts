import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class RemoveOptions implements CommandOptionProcessor {
  name = 'remove';
  aliases = ['rm'];

  match(command: string): boolean {
    return command === 'remove' || command === 'rm';
  }

  process(args: string[]): CommandOptionResult {
    const options: Record<string, unknown> = {};
    const remainingArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--global') {
        options.global = true;
      } else if (arg === '--project') {
        options.project = true;
      } else if (arg === '--local') {
        options.local = true;
      } else if (arg === '--all') {
        options.all = true;
      } else if (arg === '--json') {
        options.json = true;
      } else if (arg.startsWith('--')) {
        // Unknown option, pass it through
        options[arg.substring(2)] = true;
      } else {
        // Regular argument
        remainingArgs.push(arg);
      }
    }

    return { options, args: remainingArgs };
  }
}

import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class DoctorOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'doctor';
  }

  process(args: string[]): CommandOptionResult {
    const options: Record<string, unknown> = {};
    const remainingArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else {
        remainingArgs.push(arg);
      }
    }

    return { args: remainingArgs, options };
  }
}

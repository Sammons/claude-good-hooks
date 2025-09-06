import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class ApplyOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'apply';
  }

  process(args: string[]): CommandOptionResult {
    // Find the hook name (first non-option argument)
    let hookName = '';
    const remainingArgs: string[] = [];
    const options: Record<string, unknown> = {};
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (arg == null) {
        throw new Error("Unexpected null value in arg array. This is a bug.")
      }
      
      if (arg.startsWith('--')) {
        if (arg === '--global') {
          options.global = true;
          i++;
        } else if (arg === '--project') {
          options.project = true;
          i++;
        } else if (arg === '--local') {
          options.local = true;
          i++;
        } else if (arg === '--help') {
          options.help = true;
          i++;
        } else if (arg === '--regenerate') {
          options.regenerate = true;
          i++;
        } else {
          // Pass through other options for hook-specific parsing
          remainingArgs.push(arg);
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            remainingArgs.push(args[i + 1]);
            i += 2;
          } else {
            i++;
          }
        }
      } else {
        if (!hookName) {
          hookName = arg;
          i++;
        } else {
          remainingArgs.push(arg);
          i++;
        }
      }
    }

    const finalArgs = hookName ? [hookName, ...remainingArgs] : remainingArgs;
    
    return {
      args: finalArgs,
      options
    };
  }
}
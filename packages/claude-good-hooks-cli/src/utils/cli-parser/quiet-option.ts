import type { GlobalOptionProcessor, OptionResult } from './types.js';

export class QuietOption implements GlobalOptionProcessor {
  match(arg: string): boolean {
    return arg === '--quiet';
  }

  process(args: string[], index: number): OptionResult {
    return {
      remainingArgs: args.slice(index + 1),
      value: true,
      key: 'quiet',
      continueProcessing: true
    };
  }
}
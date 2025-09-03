import { GlobalOptionProcessor, OptionResult } from './types.js';

export class VerboseOption implements GlobalOptionProcessor {
  match(arg: string): boolean {
    return arg === '--verbose';
  }

  process(args: string[], index: number): OptionResult {
    return {
      remainingArgs: args.slice(index + 1),
      value: true,
      key: 'verbose',
      continueProcessing: true
    };
  }
}
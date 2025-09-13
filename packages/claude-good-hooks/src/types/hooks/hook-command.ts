export interface HookCommand {
  type: 'command';
  command: string;
  timeout?: number;
  enabled?: boolean;
  continueOnError?: boolean;
}
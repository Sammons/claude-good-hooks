// Shared command interfaces and types

// Help information structure
export interface HelpInfo {
  name: string;
  description: string;
  usage?: string;
  options?: Array<{
    name: string;
    description: string;
    type?: 'boolean' | 'string';
    short?: string;
  }>;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
    variadic?: boolean;
  }>;
  examples?: string[];
}

// Command validation result
export interface ValidationResult<T = unknown> {
  valid: boolean;
  error?: string;
  data?: T;
}

// Command interface for duck typing
export interface CommandLike {
  name?: string;
  description?: string;
  match(command: string): boolean;
  validate(args: string[], options: Record<string, unknown>): boolean | ValidationResult;
  execute(args: string[], options: Record<string, unknown>): Promise<void>;
  getHelp(): HelpInfo;
}

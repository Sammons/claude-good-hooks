import chalk from 'chalk';
import { createInterface, Interface } from 'readline';

/**
 * Simplified interactive prompt system
 */

export interface PromptOptions {
  message: string;
  default?: unknown;
  required?: boolean;
  validate?: (value: string) => boolean | string;
  transform?: (value: string) => unknown;
}

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

export interface SelectOptions<T> {
  message: string;
  choices: Choice<T>[];
  default?: T;
  multiple?: boolean;
}

export interface Choice<T> {
  name: string;
  value: T;
  description?: string;
  disabled?: boolean | string;
}

/**
 * Simple interactive prompt system
 */
export class SimplePrompts {
  private rl: Interface;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    // Setup cleanup handlers
    process.on('SIGINT', () => {
      this.close();
      process.exit(130);
    });
  }

  /**
   * Ask a text input question
   */
  async input(options: PromptOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const defaultText = options.default !== undefined ? chalk.gray(` (${options.default})`) : '';
      const requiredText = options.required ? chalk.red('*') : '';
      const prompt = `${chalk.cyan('?')} ${options.message}${defaultText}${requiredText}: `;

      this.rl.question(prompt, (answer) => {
        let value = answer.trim();

        // Use default if no answer provided
        if (!value && options.default !== undefined) {
          value = String(options.default);
        }

        // Validate required
        if (options.required && !value) {
          console.log(chalk.red('✗ This field is required.'));
          this.input(options).then(resolve).catch(reject);
          return;
        }

        // Validate input
        if (options.validate && value) {
          const validation = options.validate(value);
          if (validation !== true) {
            const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
            console.log(chalk.red(`✗ ${errorMessage}`));
            this.input(options).then(resolve).catch(reject);
            return;
          }
        }

        // Transform value
        if (options.transform) {
          try {
            const transformed = options.transform(value);
            resolve(String(transformed));
          } catch (error) {
            console.log(chalk.red('✗ Invalid input format'));
            this.input(options).then(resolve).catch(reject);
          }
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Ask a confirmation question
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const defaultText = options.default !== undefined ? 
      (options.default ? chalk.gray(' (Y/n)') : chalk.gray(' (y/N)')) : chalk.gray(' (y/n)');
    
    const prompt = `${chalk.cyan('?')} ${options.message}${defaultText}: `;

    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        const normalized = answer.toLowerCase().trim();

        if (!normalized && options.default !== undefined) {
          resolve(options.default);
          return;
        }

        if (normalized === 'y' || normalized === 'yes') {
          resolve(true);
        } else if (normalized === 'n' || normalized === 'no') {
          resolve(false);
        } else {
          console.log(chalk.red('✗ Please answer yes (y) or no (n)'));
          this.confirm(options).then(resolve);
        }
      });
    });
  }

  /**
   * Select from a list of choices
   */
  async select<T>(options: SelectOptions<T>): Promise<T | T[]> {
    if (options.multiple) {
      return this.multiSelect(options);
    }

    return new Promise((resolve) => {
      console.log(chalk.cyan('?'), options.message);
      
      const validChoices = options.choices.filter(choice => !choice.disabled);
      
      validChoices.forEach((choice, index) => {
        const prefix = chalk.gray(`  ${index + 1})`);
        const name = choice.name;
        const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
        console.log(`${prefix} ${name}${description}`);
      });

      if (options.default !== undefined) {
        const defaultChoice = validChoices.find(c => c.value === options.default);
        if (defaultChoice) {
          const defaultIndex = validChoices.indexOf(defaultChoice);
          console.log(chalk.gray(`  Press Enter for default: ${defaultChoice.name} (${defaultIndex + 1})`));
        }
      }

      this.rl.question(chalk.cyan('Select an option (1-' + validChoices.length + '): '), (answer) => {
        const input = answer.trim();

        if (!input && options.default !== undefined) {
          resolve(options.default);
          return;
        }

        const index = parseInt(input) - 1;
        if (isNaN(index) || index < 0 || index >= validChoices.length) {
          console.log(chalk.red('✗ Invalid selection. Please enter a number between 1 and ' + validChoices.length));
          this.select(options).then(resolve);
          return;
        }

        resolve(validChoices[index].value);
      });
    });
  }

  /**
   * Multi-select from a list of choices
   */
  private async multiSelect<T>(options: SelectOptions<T>): Promise<T[]> {
    return new Promise((resolve) => {
      console.log(chalk.cyan('?'), options.message);
      console.log(chalk.gray('  Enter comma-separated numbers (e.g., 1,3,5) or press Enter for none:'));
      
      const validChoices = options.choices.filter(choice => !choice.disabled);
      
      validChoices.forEach((choice, index) => {
        const prefix = chalk.gray(`  ${index + 1})`);
        const name = choice.name;
        const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
        console.log(`${prefix} ${name}${description}`);
      });

      this.rl.question(chalk.cyan('Select options: '), (answer) => {
        const input = answer.trim();

        if (!input) {
          resolve([]);
          return;
        }

        try {
          const indices = input.split(',').map(s => parseInt(s.trim()) - 1);
          const invalid = indices.filter(i => isNaN(i) || i < 0 || i >= validChoices.length);
          
          if (invalid.length > 0) {
            console.log(chalk.red('✗ Invalid selections. Please enter valid numbers between 1 and ' + validChoices.length));
            this.multiSelect(options).then(resolve);
            return;
          }

          const selectedValues = indices.map(index => validChoices[index].value);
          resolve(selectedValues);
        } catch (error) {
          console.log(chalk.red('✗ Invalid format. Please enter comma-separated numbers.'));
          this.multiSelect(options).then(resolve);
        }
      });
    });
  }

  /**
   * Close the prompt interface
   */
  close(): void {
    this.rl.close();
  }
}

/**
 * Create a new prompt instance
 */
export function createPrompts(): SimplePrompts {
  return new SimplePrompts();
}

/**
 * Global prompt instance for convenience
 */
let globalPrompts: SimplePrompts | null = null;

/**
 * Get or create global prompt instance
 */
export function getPrompts(): SimplePrompts {
  if (!globalPrompts) {
    globalPrompts = new SimplePrompts();
  }
  return globalPrompts;
}

/**
 * Utility functions for common prompt patterns
 */
export const prompts = {
  input: (message: string, options?: Partial<PromptOptions>) => 
    getPrompts().input({ message, ...options }),
  
  confirm: (message: string, defaultValue?: boolean) => 
    getPrompts().confirm({ message, default: defaultValue }),
  
  select: <T>(message: string, choices: Choice<T>[], defaultValue?: T) => 
    getPrompts().select({ message, choices, default: defaultValue }),
  
  multiSelect: <T>(message: string, choices: Choice<T>[]) => 
    getPrompts().select({ message, choices, multiple: true })
};

/**
 * Utility to handle non-interactive mode
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
}

/**
 * Wrapper to skip prompts in non-interactive mode
 */
export async function promptOrDefault<T>(
  promptFn: () => Promise<T>,
  defaultValue: T,
  skipMessage?: string
): Promise<T> {
  if (!isInteractive()) {
    if (skipMessage) {
      console.log(chalk.gray(`ℹ ${skipMessage}`));
    }
    return defaultValue;
  }
  return promptFn();
}

/**
 * Cleanup function to close prompts
 */
export function closePrompts(): void {
  if (globalPrompts) {
    globalPrompts.close();
    globalPrompts = null;
  }
}

/**
 * Helper to create common choice patterns
 */
export const choiceHelpers = {
  yesNo: (): Choice<boolean>[] => [
    { name: 'Yes', value: true },
    { name: 'No', value: false }
  ],

  scope: (): Choice<string>[] => [
    { name: 'Project (.claude/settings.json)', value: 'project', description: 'Apply to current project' },
    { name: 'Global (~/.claude/settings.json)', value: 'global', description: 'Apply to all projects' },
    { name: 'Local (.claude/settings.local.json)', value: 'local', description: 'Apply locally (not committed)' }
  ],

  format: (): Choice<string>[] => [
    { name: 'JSON', value: 'json', description: 'JSON format' },
    { name: 'YAML', value: 'yaml', description: 'YAML format' },
    { name: 'Template', value: 'template', description: 'Template format with examples' }
  ]
};
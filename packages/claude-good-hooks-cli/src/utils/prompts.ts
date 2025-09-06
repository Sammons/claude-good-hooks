import chalk from 'chalk';
import { createInterface, Interface } from 'readline';

/**
 * Interactive prompt system with confirmations, multi-select, and auto-complete
 */

export interface PromptOptions {
  message: string;
  default?: unknown;
  required?: boolean;
  validate?: (value: string) => boolean | string;
  transform?: (value: string) => unknown;
  mask?: boolean;
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
  pageSize?: number;
}

export interface Choice<T> {
  name: string;
  value: T;
  description?: string;
  disabled?: boolean | string;
}

export interface AutoCompleteOptions {
  message: string;
  source: string[] | ((input: string) => Promise<string[]>);
  default?: string;
  validate?: (value: string) => boolean | string;
}

/**
 * Interactive prompt system
 */
export class InteractivePrompts {
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
    while (true) {
      const value = await this.promptOnce(options);
      
      // Validate required
      if (options.required && !value) {
        console.log(chalk.red('This field is required.'));
        continue;
      }

      // Validate input
      if (options.validate && value) {
        const validation = options.validate(value);
        if (validation !== true) {
          const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
          console.log(chalk.red(errorMessage));
          continue;
        }
      }

      // Transform value
      if (options.transform) {
        try {
          const transformed = options.transform(value);
          return String(transformed);
        } catch (error) {
          console.log(chalk.red('Invalid input format'));
          continue;
        }
      }
      
      return value;
    }
  }

  private async promptOnce(options: PromptOptions): Promise<string> {
    return new Promise((resolve) => {
      const defaultText = options.default !== undefined ? ` (${options.default})` : '';
      const requiredText = options.required ? chalk.red('*') : '';
      const prompt = `${chalk.cyan('?')} ${options.message}${defaultText}${requiredText}: `;

      this.rl.question(prompt, (answer) => {
        let value = answer.trim();

        // Use default if no answer provided
        if (!value && options.default !== undefined) {
          value = String(options.default);
        }

        resolve(value);
      });
    });
  }

  /**
   * Ask a password input question (masked)
   */
  async password(options: Omit<PromptOptions, 'mask'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const prompt = `${chalk.cyan('?')} ${options.message}: `;
      
      process.stdout.write(prompt);
      
      let password = '';
      const stdin = process.stdin;
      
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (char: string) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            // Enter pressed
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            
            if (options.required && !password) {
              console.log(chalk.red('This field is required.'));
              this.password(options).then(resolve).catch(reject);
              return;
            }
            
            if (options.validate) {
              const validation = options.validate(password);
              if (validation !== true) {
                const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
                console.log(chalk.red(errorMessage));
                this.password(options).then(resolve).catch(reject);
                return;
              }
            }
            
            resolve(password);
            break;
          case '\u0003':
            // Ctrl+C
            stdin.setRawMode(false);
            stdin.pause();
            process.exit(130);
            break;
          case '\u007f':
            // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            // Regular character
            password += char;
            process.stdout.write('*');
            break;
        }
      };

      stdin.on('data', onData);
    });
  }

  /**
   * Ask a confirmation question
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const defaultText = options.default !== undefined ? 
      (options.default ? ' (Y/n)' : ' (y/N)') : ' (y/n)';
    
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
          console.log(chalk.red('Please answer yes (y) or no (n)'));
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
        const prefix = chalk.gray(`${index + 1})`);
        const name = choice.name;
        const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
        console.log(`  ${prefix} ${name}${description}`);
      });

      if (options.default !== undefined) {
        const defaultChoice = validChoices.find(c => c.value === options.default);
        if (defaultChoice) {
          const defaultIndex = validChoices.indexOf(defaultChoice);
          console.log(chalk.gray(`Press Enter for default: ${defaultChoice.name} (${defaultIndex + 1})`));
        }
      }

      this.rl.question(chalk.cyan('Select an option: '), (answer) => {
        const input = answer.trim();

        if (!input && options.default !== undefined) {
          resolve(options.default);
          return;
        }

        const index = parseInt(input) - 1;
        if (isNaN(index) || index < 0 || index >= validChoices.length) {
          console.log(chalk.red('Invalid selection. Please enter a number between 1 and ' + validChoices.length));
          this.select(options).then(resolve);
          return;
        }

        const choice = validChoices[index];
        if (choice) {
          resolve(choice.value);
        } else {
          console.log(chalk.red('✗ Invalid selection'));
          this.select(options).then(resolve);
        }
      });
    });
  }

  /**
   * Multi-select from a list of choices
   */
  private async multiSelect<T>(options: SelectOptions<T>): Promise<T[]> {
    return new Promise((resolve) => {
      console.log(chalk.cyan('?'), options.message);
      console.log(chalk.gray('(Use space to select, enter to confirm)'));
      
      const validChoices = options.choices.filter(choice => !choice.disabled);
      const selected = new Set<number>();
      let currentIndex = 0;

      const render = () => {
        // Clear previous output
        process.stdout.write('\x1B[' + (validChoices.length + 2) + 'A');
        process.stdout.write('\x1B[J');
        
        console.log(chalk.cyan('?'), options.message);
        console.log(chalk.gray('(Use ↑↓ to navigate, space to select, enter to confirm)'));
        
        validChoices.forEach((choice, index) => {
          const isSelected = selected.has(index);
          const isCurrent = index === currentIndex;
          
          let prefix = '  ';
          if (isCurrent) {
            prefix = chalk.cyan('❯ ');
          }
          
          const checkbox = isSelected ? chalk.green('◉') : '◯';
          const name = isCurrent ? chalk.cyan(choice.name) : choice.name;
          const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
          
          console.log(`${prefix}${checkbox} ${name}${description}`);
        });
      };

      // Initial render
      render();

      // Setup raw input handling
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onKeypress = (_str: string, key: { name: string; ctrl?: boolean }) => {
        switch (key.name) {
          case 'up':
            currentIndex = Math.max(0, currentIndex - 1);
            render();
            break;
          case 'down':
            currentIndex = Math.min(validChoices.length - 1, currentIndex + 1);
            render();
            break;
          case 'space':
            if (selected.has(currentIndex)) {
              selected.delete(currentIndex);
            } else {
              selected.add(currentIndex);
            }
            render();
            break;
          case 'return':
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('keypress', onKeypress);
            
            const selectedValues = Array.from(selected).map(index => {
              const choice = validChoices[index];
              return choice ? choice.value : undefined;
            }).filter((value): value is string => value !== undefined);
            resolve(selectedValues);
            break;
          case 'c':
            if (key.ctrl) {
              process.stdin.setRawMode(false);
              process.exit(130);
            }
            break;
        }
      };

      process.stdin.on('keypress', onKeypress);
      
      // Enable keypress events
      const keypress = require('keypress');
      keypress(process.stdin);
    });
  }

  /**
   * Auto-complete input
   */
  async autocomplete(options: AutoCompleteOptions): Promise<string> {
    // For simplicity, this is a basic implementation
    // In a production environment, you might want to use a library like inquirer
    
    const suggestions = typeof options.source === 'function' 
      ? await options.source('')
      : options.source;

    console.log(chalk.cyan('?'), options.message);
    if (suggestions.length > 0) {
      console.log(chalk.gray('Available options:'));
      suggestions.slice(0, 10).forEach(suggestion => {
        console.log(chalk.gray(`  - ${suggestion}`));
      });
      if (suggestions.length > 10) {
        console.log(chalk.gray(`  ... and ${suggestions.length - 10} more`));
      }
    }

    return this.input({
      message: 'Your choice',
      default: options.default,
      validate: (value) => {
        if (options.validate) {
          return options.validate(value);
        }
        return true;
      }
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
 * Create a new interactive prompt instance
 */
export function createPrompts(): InteractivePrompts {
  return new InteractivePrompts();
}

/**
 * Global prompt instance for convenience
 */
let globalPrompts: InteractivePrompts | null = null;

/**
 * Get or create global prompt instance
 */
export function getPrompts(): InteractivePrompts {
  if (!globalPrompts) {
    globalPrompts = new InteractivePrompts();
  }
  return globalPrompts;
}

/**
 * Utility functions for common prompt patterns
 */
export const prompts = {
  input: (message: string, options?: Partial<PromptOptions>) => 
    getPrompts().input({ message, ...options }),
  
  password: (message: string, options?: Partial<PromptOptions>) => 
    getPrompts().password({ message, ...options }),
  
  confirm: (message: string, defaultValue?: boolean) => 
    getPrompts().confirm({ message, default: defaultValue }),
  
  select: <T>(message: string, choices: Choice<T>[], defaultValue?: T) => 
    getPrompts().select({ message, choices, default: defaultValue }),
  
  multiSelect: <T>(message: string, choices: Choice<T>[]) => 
    getPrompts().select({ message, choices, multiple: true }),
  
  autocomplete: (message: string, source: string[] | ((input: string) => Promise<string[]>), defaultValue?: string) => 
    getPrompts().autocomplete({ message, source, default: defaultValue })
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
      console.log(chalk.gray(skipMessage));
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
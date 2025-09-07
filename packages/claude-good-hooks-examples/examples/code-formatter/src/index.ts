#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface CodeFormatterConfig {
  /** Enable automatic formatting */
  enabled?: boolean;
  /** Formatters to use by file extension */
  formatters?: Record<string, string>;
  /** Files to exclude from formatting */
  exclude?: string[];
  /** Custom prettier config path */
  prettierConfig?: string;
  /** Format on pre-tool use (before editing) */
  formatOnPreUse?: boolean;
  /** Format on post-tool use (after editing) */
  formatOnPostUse?: boolean;
  /** Show formatting results */
  showResults?: boolean;
  /** Fail if formatting fails */
  failOnError?: boolean;
}

const DEFAULT_FORMATTERS: Record<string, string> = {
  '.js': 'prettier --write',
  '.ts': 'prettier --write',
  '.jsx': 'prettier --write',
  '.tsx': 'prettier --write',
  '.json': 'prettier --write',
  '.css': 'prettier --write',
  '.scss': 'prettier --write',
  '.html': 'prettier --write',
  '.md': 'prettier --write',
  '.py': 'black',
  '.go': 'gofmt -w',
  '.rs': 'rustfmt',
  '.java': 'google-java-format --replace',
  '.cpp': 'clang-format -i',
  '.c': 'clang-format -i'
};

const DEFAULT_CONFIG: Required<CodeFormatterConfig> = {
  enabled: true,
  formatters: DEFAULT_FORMATTERS,
  exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**', '*.min.js'],
  prettierConfig: '',
  formatOnPreUse: false,
  formatOnPostUse: true,
  showResults: true,
  failOnError: false
};

class CodeFormatterHook {
  private config: Required<CodeFormatterConfig>;

  constructor(config: CodeFormatterConfig = {}) {
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      formatters: { ...DEFAULT_FORMATTERS, ...config.formatters }
    };
  }

  /**
   * Check if a file should be formatted
   */
  private shouldFormatFile(filePath: string): boolean {
    if (!this.config.enabled) return false;

    // Check exclusions
    for (const pattern of this.config.exclude) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    const ext = path.extname(filePath);
    return ext in this.config.formatters;
  }

  /**
   * Simple pattern matching (supports basic wildcards)
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Format a single file
   */
  async formatFile(filePath: string): Promise<{ success: boolean; message: string }> {
    if (!await this.fileExists(filePath)) {
      return { success: false, message: `File does not exist: ${filePath}` };
    }

    if (!this.shouldFormatFile(filePath)) {
      return { success: true, message: `Skipped (not configured for formatting): ${filePath}` };
    }

    const ext = path.extname(filePath);
    let command = this.config.formatters[ext];

    if (!command) {
      return { success: true, message: `No formatter configured for ${ext}` };
    }

    // Add prettier config if specified and it's a prettier command
    if (command.includes('prettier') && this.config.prettierConfig) {
      command += ` --config ${this.config.prettierConfig}`;
    }

    // Add file path to command
    command += ` "${filePath}"`;

    try {
      const result = await this.runCommand(command);
      
      if (result.exitCode === 0) {
        return { 
          success: true, 
          message: `✅ Formatted: ${path.basename(filePath)}${result.output ? '\\n' + result.output : ''}`
        };
      } else {
        return { 
          success: false, 
          message: `❌ Format failed: ${path.basename(filePath)}\\n${result.error || result.output}`
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `❌ Format error: ${path.basename(filePath)}\\n${error}`
      };
    }
  }

  /**
   * Format multiple files
   */
  async formatFiles(filePaths: string[]): Promise<{ 
    formatted: string[]; 
    failed: string[]; 
    skipped: string[];
    messages: string[];
  }> {
    const formatted: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    const messages: string[] = [];

    for (const filePath of filePaths) {
      const result = await this.formatFile(filePath);
      
      if (result.success) {
        if (result.message.includes('Skipped')) {
          skipped.push(filePath);
        } else {
          formatted.push(filePath);
        }
      } else {
        failed.push(filePath);
      }
      
      if (this.config.showResults) {
        messages.push(result.message);
      }
    }

    return { formatted, failed, skipped, messages };
  }

  /**
   * Extract file path from tool input
   */
  extractFilePaths(toolInput: Record<string, unknown>): string[] {
    const paths: string[] = [];

    if (typeof toolInput?.file_path === 'string') {
      paths.push(toolInput.file_path);
    }

    if (typeof toolInput?.filePath === 'string') {
      paths.push(toolInput.filePath);
    }

    if (toolInput?.edits && Array.isArray(toolInput.edits) && typeof toolInput.file_path === 'string') {
      // Handle MultiEdit tool
      paths.push(toolInput.file_path);
    }

    return paths.filter(Boolean);
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run shell command
   */
  private async runCommand(command: string): Promise<{
    exitCode: number;
    output: string;
    error: string;
  }> {
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          output: output.trim(),
          error: error.trim()
        });
      });

      child.on('error', (err) => {
        resolve({
          exitCode: 1,
          output: '',
          error: err.message
        });
      });
    });
  }

  /**
   * Get available formatters
   */
  getAvailableFormatters(): Record<string, string> {
    return { ...this.config.formatters };
  }

  /**
   * Check if formatters are available
   */
  async checkFormatterAvailability(): Promise<Record<string, boolean>> {
    const availability: Record<string, boolean> = {};
    const uniqueFormatters = [...new Set(Object.values(this.config.formatters))];

    for (const formatter of uniqueFormatters) {
      const command = formatter.split(' ')[0]; // Get base command
      try {
        const result = await this.runCommand(`which ${command}`);
        availability[formatter] = result.exitCode === 0;
      } catch {
        availability[formatter] = false;
      }
    }

    return availability;
  }
}

// Hook implementation
const codeFormatterHook: HookPlugin = {
  name: 'code-formatter',
  description: 'Automatic code formatting when files are created or modified',
  version: '1.0.0',
  customArgs: {
    enabled: {
      description: 'Enable automatic code formatting',
      type: 'boolean',
      default: true
    },
    formatOnPreUse: {
      description: 'Format files before editing (PreToolUse)',
      type: 'boolean',
      default: false
    },
    formatOnPostUse: {
      description: 'Format files after editing (PostToolUse)', 
      type: 'boolean',
      default: true
    },
    showResults: {
      description: 'Show formatting results',
      type: 'boolean',
      default: true
    },
    failOnError: {
      description: 'Fail hook execution if formatting fails',
      type: 'boolean',
      default: false
    },
    prettierConfig: {
      description: 'Path to prettier configuration file',
      type: 'string',
      default: ''
    }
  },
  makeHook: (args) => {
    const config: CodeFormatterConfig = {
      enabled: args.enabled as boolean,
      formatOnPreUse: args.formatOnPreUse as boolean,
      formatOnPostUse: args.formatOnPostUse as boolean,
      showResults: args.showResults as boolean,
      failOnError: args.failOnError as boolean,
      prettierConfig: args.prettierConfig as string
    };

    const formatter = new CodeFormatterHook(config);

    const preToolUseHooks = [];
    const postToolUseHooks = [];

    if (config.formatOnPreUse) {
      preToolUseHooks.push({
        matcher: 'Write|Edit|MultiEdit',
        hooks: [{
          type: 'command' as const,
          command: `node -e "
            (async () => {
              try {
                const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
                const { CodeFormatterHook } = require('./dist/index.js');
                const formatter = new CodeFormatterHook(${JSON.stringify(config)});
                
                const filePaths = formatter.extractFilePaths(input.tool_input || {});
                if (filePaths.length === 0) process.exit(0);
                
                const result = await formatter.formatFiles(filePaths);
                if (result.messages.length > 0 && ${config.showResults}) {
                  console.log('🎨 Pre-format Results:');
                  result.messages.forEach(msg => console.log(msg));
                }
                if (result.failed.length > 0 && ${config.failOnError}) {
                  console.error('Formatting failed for:', result.failed.join(', '));
                  process.exit(2);
                }
              } catch (err) {
                console.error('Pre-format error:', err);
                if (${config.failOnError}) process.exit(2);
              }
            })();
          "`,
          timeout: 10000
        }]
      });
    }

    if (config.formatOnPostUse) {
      postToolUseHooks.push({
        matcher: 'Write|Edit|MultiEdit',
        hooks: [{
          type: 'command' as const,
          command: `node -e "
            (async () => {
              try {
                const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
                const { CodeFormatterHook } = require('./dist/index.js');
                const formatter = new CodeFormatterHook(${JSON.stringify(config)});
                
                const filePaths = formatter.extractFilePaths(input.tool_input || {});
                if (filePaths.length === 0) process.exit(0);
                
                // Add a small delay to ensure file is written
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const result = await formatter.formatFiles(filePaths);
                if (result.messages.length > 0 && ${config.showResults}) {
                  console.log('🎨 Post-format Results:');
                  result.messages.forEach(msg => console.log(msg));
                }
                if (result.failed.length > 0 && ${config.failOnError}) {
                  console.error('Formatting failed for:', result.failed.join(', '));
                  process.exit(2);
                }
              } catch (err) {
                console.error('Post-format error:', err);
                if (${config.failOnError}) process.exit(2);
              }
            })();
          "`,
          timeout: 10000
        }]
      });
    }

    return {
      ...(preToolUseHooks.length > 0 && { PreToolUse: preToolUseHooks }),
      ...(postToolUseHooks.length > 0 && { PostToolUse: postToolUseHooks })
    };
  }
};

export default codeFormatterHook;
export { CodeFormatterHook, type CodeFormatterConfig };
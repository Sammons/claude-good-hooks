#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface TestRunnerConfig {
  /** Enable automatic test running */
  enabled?: boolean;
  /** Test frameworks to detect and use */
  frameworks?: {
    jest?: { command: string; pattern: string };
    vitest?: { command: string; pattern: string };
    pytest?: { command: string; pattern: string };
    go?: { command: string; pattern: string };
    cargo?: { command: string; pattern: string };
  };
  /** When to run tests */
  runOn?: ('PreToolUse' | 'PostToolUse' | 'UserPromptSubmit')[];
  /** Run only related tests instead of full suite */
  smartSelection?: boolean;
  /** Maximum test execution time in seconds */
  timeout?: number;
  /** Show test output */
  showOutput?: boolean;
  /** Show coverage information */
  showCoverage?: boolean;
  /** Fail if tests don't pass */
  failOnTestFailure?: boolean;
  /** File patterns that should trigger tests */
  triggerPatterns?: string[];
  /** Directories to exclude from test triggers */
  excludePatterns?: string[];
}

const DEFAULT_CONFIG: Required<TestRunnerConfig> = {
  enabled: true,
  frameworks: {
    jest: { command: 'npm test', pattern: '**/*.{test,spec}.{js,ts,jsx,tsx}' },
    vitest: { command: 'npm run test', pattern: '**/*.{test,spec}.{js,ts}' },
    pytest: { command: 'python -m pytest', pattern: '**/test_*.py' },
    go: { command: 'go test ./...', pattern: '**/*_test.go' },
    cargo: { command: 'cargo test', pattern: '**/tests/**/*.rs' },
  },
  runOn: ['PostToolUse'],
  smartSelection: true,
  timeout: 60,
  showOutput: true,
  showCoverage: false,
  failOnTestFailure: false,
  triggerPatterns: [
    '**/*.{js,ts,jsx,tsx,py,go,rs}',
    '**/package.json',
    '**/Cargo.toml',
    '**/requirements.txt',
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/target/**',
    '**/__pycache__/**',
  ],
};

class TestRunnerHook {
  private config: Required<TestRunnerConfig>;

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      frameworks: { ...DEFAULT_CONFIG.frameworks, ...config.frameworks },
    };
  }

  /**
   * Detect which test framework is being used
   */
  async detectTestFramework(): Promise<string | null> {
    const cwd = process.cwd();

    try {
      // Check for package.json and test scripts
      const packageJsonPath = path.join(cwd, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const scripts = packageJson.scripts || {};
        const devDeps = packageJson.devDependencies || {};
        const deps = packageJson.dependencies || {};
        const allDeps = { ...deps, ...devDeps };

        if (allDeps.vitest || scripts.test?.includes('vitest')) {
          return 'vitest';
        }
        if (allDeps.jest || allDeps['@types/jest'] || scripts.test?.includes('jest')) {
          return 'jest';
        }
      }

      // Check for Python
      if (
        (await this.fileExists(path.join(cwd, 'requirements.txt'))) ||
        (await this.fileExists(path.join(cwd, 'setup.py'))) ||
        (await this.fileExists(path.join(cwd, 'pyproject.toml')))
      ) {
        return 'pytest';
      }

      // Check for Go
      if (await this.fileExists(path.join(cwd, 'go.mod'))) {
        return 'go';
      }

      // Check for Rust
      if (await this.fileExists(path.join(cwd, 'Cargo.toml'))) {
        return 'cargo';
      }
    } catch (error) {
      console.warn('Error detecting test framework:', error);
    }

    return null;
  }

  /**
   * Check if file change should trigger tests
   */
  private shouldTriggerTests(filePaths: string[]): boolean {
    if (!this.config.enabled) return false;
    if (filePaths.length === 0) return false;

    for (const filePath of filePaths) {
      // Check if file matches trigger patterns
      const shouldTrigger = this.config.triggerPatterns.some(pattern =>
        this.matchesPattern(filePath, pattern)
      );

      // Check if file matches exclude patterns
      const shouldExclude = this.config.excludePatterns.some(pattern =>
        this.matchesPattern(filePath, pattern)
      );

      if (shouldTrigger && !shouldExclude) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get related test files for changed files (smart selection)
   */
  async getRelatedTests(changedFiles: string[]): Promise<string[]> {
    if (!this.config.smartSelection) {
      return [];
    }

    const testFiles: string[] = [];

    for (const filePath of changedFiles) {
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, path.extname(filePath));

      // Common test file naming patterns
      const testPatterns = [
        `${dir}/${basename}.test.*`,
        `${dir}/${basename}.spec.*`,
        `${dir}/__tests__/${basename}.*`,
        `${dir}/test_${basename}.*`, // Python style
        `${dir}/${basename}_test.*`, // Go style
      ];

      for (const pattern of testPatterns) {
        try {
          // Simple glob-like matching - in real implementation, use a proper glob library
          const potentialTests = await this.findTestFiles(pattern);
          testFiles.push(...potentialTests);
        } catch (error) {
          // Ignore errors in test file discovery
        }
      }
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Find test files matching pattern (simplified implementation)
   */
  private async findTestFiles(pattern: string): Promise<string[]> {
    // This is a simplified implementation
    // In production, use a proper glob library like 'glob' or 'fast-glob'
    const testFiles: string[] = [];

    try {
      const stats = await fs.stat(pattern.replace('*', 'test'));
      if (stats.isFile()) {
        testFiles.push(pattern.replace('*', 'test'));
      }
    } catch {
      // File doesn't exist, which is fine
    }

    return testFiles;
  }

  /**
   * Run tests for the detected framework
   */
  async runTests(
    framework: string,
    specificTests?: string[]
  ): Promise<{
    success: boolean;
    output: string;
    error: string;
    duration: number;
  }> {
    const frameworkConfig =
      this.config.frameworks[framework as keyof typeof this.config.frameworks];
    if (!frameworkConfig) {
      return {
        success: false,
        output: '',
        error: `No configuration found for framework: ${framework}`,
        duration: 0,
      };
    }

    let command = frameworkConfig.command;

    // Add specific test files if using smart selection
    if (specificTests && specificTests.length > 0 && this.config.smartSelection) {
      if (framework === 'jest' || framework === 'vitest') {
        command += ` ${specificTests.join(' ')}`;
      } else if (framework === 'pytest') {
        command += ` ${specificTests.join(' ')}`;
      }
      // For Go and Cargo, running specific tests is more complex
    }

    // Add coverage flag if enabled
    if (this.config.showCoverage) {
      if (framework === 'jest') {
        command += ' --coverage';
      } else if (framework === 'vitest') {
        command += ' --coverage';
      } else if (framework === 'pytest') {
        command += ' --cov';
      }
    }

    const startTime = Date.now();

    try {
      const result = await this.runCommand(command, this.config.timeout * 1000);
      const duration = Date.now() - startTime;

      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: String(error),
        duration,
      };
    }
  }

  /**
   * Format test results for display
   */
  formatTestResults(
    results: {
      success: boolean;
      output: string;
      error: string;
      duration: number;
    },
    framework: string
  ): string {
    let output = `\\n🧪 Test Results (${framework}):`;

    if (results.success) {
      output += ` ✅ PASSED`;
    } else {
      output += ` ❌ FAILED`;
    }

    output += ` (${(results.duration / 1000).toFixed(2)}s)\\n`;

    if (this.config.showOutput && results.output) {
      // Extract key information from test output
      const lines = results.output.split('\\n');
      const summaryLines = lines.filter(
        line =>
          line.includes('passed') ||
          line.includes('failed') ||
          line.includes('Test Suites') ||
          line.includes('coverage') ||
          line.match(/\\d+\\s+(passed|failed|skipped)/)
      );

      if (summaryLines.length > 0) {
        output += summaryLines.slice(0, 5).join('\\n') + '\\n';
      }
    }

    if (!results.success && results.error) {
      const errorLines = results.error.split('\\n').slice(0, 3);
      output += `Error: ${errorLines.join('\\n')}\\n`;
    }

    return output;
  }

  /**
   * Extract file paths from tool input
   */
  extractFilePaths(toolInput: any): string[] {
    const paths: string[] = [];

    if (toolInput?.file_path) {
      paths.push(toolInput.file_path);
    }

    if (toolInput?.filePath) {
      paths.push(toolInput.filePath);
    }

    if (toolInput?.edits && Array.isArray(toolInput.edits) && toolInput.file_path) {
      paths.push(toolInput.file_path);
    }

    return paths.filter(Boolean);
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(filePath);
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
   * Run shell command with timeout
   */
  private async runCommand(
    command: string,
    timeout: number
  ): Promise<{
    exitCode: number;
    output: string;
    error: string;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', data => {
        output += data.toString();
      });

      child.stderr?.on('data', data => {
        error += data.toString();
      });

      child.on('close', code => {
        if (timedOut) return;
        clearTimeout(timer);
        resolve({
          exitCode: code || 0,
          output: output.trim(),
          error: error.trim(),
        });
      });

      child.on('error', err => {
        if (timedOut) return;
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}

// Hook implementation
const testRunnerHook: HookPlugin = {
  name: 'test-runner',
  description: 'Intelligent test runner that runs relevant tests when code changes',
  version: '1.0.0',
  customArgs: {
    enabled: {
      description: 'Enable automatic test running',
      type: 'boolean',
      default: true,
    },
    smartSelection: {
      description: 'Run only tests related to changed files',
      type: 'boolean',
      default: true,
    },
    timeout: {
      description: 'Maximum test execution time in seconds',
      type: 'number',
      default: 60,
    },
    showOutput: {
      description: 'Show test execution output',
      type: 'boolean',
      default: true,
    },
    showCoverage: {
      description: 'Include test coverage information',
      type: 'boolean',
      default: false,
    },
    failOnTestFailure: {
      description: 'Fail hook execution if tests fail',
      type: 'boolean',
      default: false,
    },
  },
  makeHook: args => {
    const config: TestRunnerConfig = {
      enabled: args.enabled as boolean,
      smartSelection: args.smartSelection as boolean,
      timeout: args.timeout as number,
      showOutput: args.showOutput as boolean,
      showCoverage: args.showCoverage as boolean,
      failOnTestFailure: args.failOnTestFailure as boolean,
      runOn: (args.runOn as TestRunnerConfig['runOn']) || ['PostToolUse'],
    };

    const runner = new TestRunnerHook(config);
    const hooks: any = {};

    if (config.runOn?.includes('PostToolUse')) {
      hooks.PostToolUse = [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command' as const,
              command: `node -e "
            const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
            const { TestRunnerHook } = require('./dist/index.js');
            const runner = new TestRunnerHook(${JSON.stringify(config)});
            
            (async () => {
              try {
                const filePaths = runner.extractFilePaths(input.tool_input || {});
                
                if (!runner.shouldTriggerTests || !runner.shouldTriggerTests(filePaths)) {
                  process.exit(0);
                }
                
                const framework = await runner.detectTestFramework();
                if (!framework) {
                  console.log('🧪 No test framework detected');
                  process.exit(0);
                }
                
                let testFiles = [];
                if (${config.smartSelection}) {
                  testFiles = await runner.getRelatedTests(filePaths);
                }
                
                console.log('🧪 Running tests...');
                const results = await runner.runTests(framework, testFiles);
                const output = runner.formatTestResults(results, framework);
                
                console.log(output);
                
                if (!results.success && ${config.failOnTestFailure}) {
                  process.exit(2);
                }
              } catch (error) {
                console.error('🧪 Test runner error:', error);
                if (${config.failOnTestFailure}) process.exit(2);
              }
            })();
          "`,
              timeout: (config.timeout || 60) * 1000 + 10000, // Add buffer to hook timeout
            },
          ],
        },
      ];
    }

    return hooks;
  },
};

export default testRunnerHook;
export { TestRunnerHook, type TestRunnerConfig };

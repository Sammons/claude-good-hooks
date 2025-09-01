#!/usr/bin/env tsx

/**
 * Development Environment Setup
 * 
 * This script sets up the development environment for the Claude Good Hooks monorepo,
 * including dependency installation, builds, and development server startup.
 */

import { spawn } from 'child_process';
import path from 'path';
import { promisify } from 'util';

interface ExecOptions {
  silent?: boolean;
  cwd?: string;
}

class DevSetup {
  private rootDir: string;
  private isCI: boolean;

  constructor() {
    this.rootDir = process.cwd();
    this.isCI = process.env.CI === 'true';
  }

  private log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      reset: '\x1b[0m'
    };

    console.log(`${colors[level]}[${timestamp}] ${message}${colors.reset}`);
  }

  private async execCommand(command: string, options: ExecOptions = {}): Promise<string> {
    const { silent = false, cwd = this.rootDir } = options;
    
    return new Promise((resolve, reject) => {
      if (!silent) {
        this.log(`Running: ${command}`);
      }

      const child = spawn('sh', ['-c', command], {
        stdio: silent ? 'pipe' : 'inherit',
        cwd,
      });

      let stdout = '';
      let stderr = '';

      if (silent) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with exit code ${code}: ${stderr || command}`);
          reject(error);
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  public async setup(): Promise<void> {
    try {
      this.log('🚀 Starting development environment setup...', 'info');

      // Install dependencies
      this.log('📦 Installing dependencies...', 'info');
      await this.execCommand('pnpm install --frozen-lockfile');

      // Build packages
      this.log('🔨 Building packages...', 'info');
      await this.execCommand('pnpm run build');

      // Run linting
      if (!this.isCI) {
        this.log('🧹 Running linter...', 'info');
        await this.execCommand('pnpm run lint');
      }

      this.log('✅ Development environment setup complete!', 'success');
      this.log('📝 Next steps:', 'info');
      this.log('  • Run "pnpm run dev" to start development servers', 'info');
      this.log('  • Run "pnpm test" to run tests', 'info');
      this.log('  • Check the README for more commands', 'info');

    } catch (error) {
      this.log(`❌ Setup failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      process.exit(1);
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new DevSetup();
  setup.setup().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { DevSetup };
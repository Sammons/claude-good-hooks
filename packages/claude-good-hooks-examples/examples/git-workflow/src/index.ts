#!/usr/bin/env node

import { simpleGit, type SimpleGit } from 'simple-git';
import { minimatch } from 'minimatch';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface GitWorkflowConfig {
  /** Show git status in output */
  showStatus?: boolean;
  /** Include file names in status */
  showFilenames?: boolean;
  /** Show staged changes only */
  stagedOnly?: boolean;
  /** Protected branches that require special handling */
  protectedBranches?: string[];
  /** Branch naming patterns to enforce */
  branchPatterns?: string[];
  /** Maximum number of files to show */
  maxFiles?: number;
  /** Commit message validation patterns */
  commitMessagePattern?: string;
  /** Auto-stash changes before operations */
  autoStash?: boolean;
}

const DEFAULT_CONFIG: Required<GitWorkflowConfig> = {
  showStatus: true,
  showFilenames: true,
  stagedOnly: false,
  protectedBranches: ['main', 'master', 'develop'],
  branchPatterns: ['feature/*', 'bugfix/*', 'hotfix/*'],
  maxFiles: 10,
  commitMessagePattern: '^(feat|fix|docs|style|refactor|test|chore)(\\(.+\\))?: .{1,50}',
  autoStash: false,
};

class GitWorkflowHook {
  private git: SimpleGit;
  private config: Required<GitWorkflowConfig>;

  constructor(config: GitWorkflowConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.git = simpleGit();
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get formatted git status information
   */
  async getGitStatus(): Promise<string> {
    if (!(await this.isGitRepository())) {
      return 'Not in a git repository';
    }

    try {
      const status = await this.git.status();
      const branch = status.current || 'unknown';

      let output = `📍 Current branch: ${branch}\\n`;

      // Check if on protected branch
      if (this.config.protectedBranches.includes(branch)) {
        output += `⚠️  WARNING: You are on a protected branch (${branch})\\n`;
      }

      // Show changes
      const changes = this.formatChanges(status);
      if (changes) {
        output += changes;
      } else {
        output += '✅ Working directory clean\\n';
      }

      // Show remote status
      if (status.ahead > 0) {
        output += `⬆️  ${status.ahead} commits ahead of origin\\n`;
      }
      if (status.behind > 0) {
        output += `⬇️  ${status.behind} commits behind origin\\n`;
      }

      return output;
    } catch (error) {
      return `❌ Git status error: ${error}`;
    }
  }

  /**
   * Format file changes for display
   */
  private formatChanges(status: any): string {
    let output = '';
    let fileCount = 0;

    // Staged files
    if (status.staged.length > 0 && !this.config.stagedOnly) {
      output += `\\n🟢 Staged changes (${status.staged.length}):`;
      for (const file of status.staged.slice(0, this.config.maxFiles)) {
        if (this.config.showFilenames) {
          output += `\\n  ✓ ${file}`;
        }
        fileCount++;
      }
      if (status.staged.length > this.config.maxFiles) {
        output += `\\n  ... and ${status.staged.length - this.config.maxFiles} more`;
      }
      output += '\\n';
    }

    // Modified files
    if (status.modified.length > 0 && !this.config.stagedOnly) {
      output += `\\n🟡 Modified files (${status.modified.length}):`;
      for (const file of status.modified.slice(0, this.config.maxFiles)) {
        if (this.config.showFilenames) {
          output += `\\n  📝 ${file}`;
        }
        fileCount++;
      }
      if (status.modified.length > this.config.maxFiles) {
        output += `\\n  ... and ${status.modified.length - this.config.maxFiles} more`;
      }
      output += '\\n';
    }

    // Untracked files
    if (status.not_added.length > 0 && !this.config.stagedOnly) {
      output += `\\n🔴 Untracked files (${status.not_added.length}):`;
      for (const file of status.not_added.slice(0, this.config.maxFiles)) {
        if (this.config.showFilenames) {
          output += `\\n  ➕ ${file}`;
        }
        fileCount++;
      }
      if (status.not_added.length > this.config.maxFiles) {
        output += `\\n  ... and ${status.not_added.length - this.config.maxFiles} more`;
      }
      output += '\\n';
    }

    return output;
  }

  /**
   * Validate branch name against patterns
   */
  async validateBranchName(): Promise<{ valid: boolean; message: string }> {
    if (!(await this.isGitRepository())) {
      return { valid: true, message: 'Not in git repository' };
    }

    const status = await this.git.status();
    const branch = status.current || 'unknown';

    // Skip validation for protected branches
    if (this.config.protectedBranches.includes(branch)) {
      return { valid: true, message: 'Protected branch' };
    }

    // Check against patterns
    const isValid = this.config.branchPatterns.some(pattern => minimatch(branch, pattern));

    return {
      valid: isValid,
      message: isValid
        ? `Branch name '${branch}' follows naming conventions`
        : `Branch name '${branch}' does not match patterns: ${this.config.branchPatterns.join(', ')}`,
    };
  }

  /**
   * Validate commit message format
   */
  validateCommitMessage(message: string): { valid: boolean; message: string } {
    if (!this.config.commitMessagePattern) {
      return { valid: true, message: 'No validation pattern configured' };
    }

    const pattern = new RegExp(this.config.commitMessagePattern);
    const isValid = pattern.test(message);

    return {
      valid: isValid,
      message: isValid
        ? 'Commit message follows conventions'
        : `Commit message does not match pattern: ${this.config.commitMessagePattern}`,
    };
  }

  /**
   * Auto-stash changes if configured
   */
  async handleAutoStash(): Promise<string> {
    if (!this.config.autoStash || !(await this.isGitRepository())) {
      return '';
    }

    try {
      const status = await this.git.status();
      if (status.modified.length > 0 || status.not_added.length > 0) {
        await this.git.stash(['push', '-m', 'Auto-stash by claude-hook']);
        return '📦 Changes auto-stashed\\n';
      }
    } catch (error) {
      return `⚠️ Auto-stash failed: ${error}\\n`;
    }

    return '';
  }
}

// Hook implementation
const gitWorkflowHook: HookPlugin = {
  name: 'git-workflow',
  description: 'Comprehensive git workflow integration for development',
  version: '1.0.0',
  customArgs: {
    showStatus: {
      description: 'Show git status information',
      type: 'boolean',
      default: true,
    },
    showFilenames: {
      description: 'Include filenames in status output',
      type: 'boolean',
      default: true,
    },
    stagedOnly: {
      description: 'Show only staged changes',
      type: 'boolean',
      default: false,
    },
    maxFiles: {
      description: 'Maximum number of files to display',
      type: 'number',
      default: 10,
    },
    autoStash: {
      description: 'Automatically stash changes when needed',
      type: 'boolean',
      default: false,
    },
  },
  makeHook: args => {
    const config: GitWorkflowConfig = {
      showStatus: args.showStatus as boolean,
      showFilenames: args.showFilenames as boolean,
      stagedOnly: args.stagedOnly as boolean,
      maxFiles: args.maxFiles as number,
      autoStash: args.autoStash as boolean,
    };

    const hook = new GitWorkflowHook(config);

    return {
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: 'command',
              command: `node -e "
            (async () => {
              try {
                const { GitWorkflowHook } = require('./dist/index.js');
                const hook = new GitWorkflowHook(${JSON.stringify(config)});
                const status = await hook.getGitStatus();
                if (status && status !== 'Not in a git repository') {
                  console.log('🔧 Git Status:');
                  console.log(status);
                }
              } catch (err) {
                console.error('Git hook error:', err);
              }
            })();
          "`,
              timeout: 5000,
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: `node -e "
            (async () => {
              try {
                const { GitWorkflowHook } = require('./dist/index.js');
                const hook = new GitWorkflowHook(${JSON.stringify(config)});
                
                // Validate branch and potentially stash
                const [branchValidation, stashResult] = await Promise.all([
                  hook.validateBranchName(),
                  hook.handleAutoStash()
                ]);
                
                if (stashResult) console.log(stashResult);
                if (!branchValidation.valid) {
                  console.error('❌ Branch validation failed:', branchValidation.message);
                  process.exit(2); // Block the operation
                }
              } catch (err) {
                console.error('Pre-tool validation error:', err);
              }
            })();
          "`,
              timeout: 3000,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: `node -e "
            (async () => {
              try {
                const { GitWorkflowHook } = require('./dist/index.js');
                const hook = new GitWorkflowHook(${JSON.stringify(config)});
                
                // Show updated git status
                const status = await hook.getGitStatus();
                if (status && status !== 'Not in a git repository') {
                  console.log('\\n📊 Updated Git Status:');
                  console.log(status);
                }
              } catch (err) {
                console.error('Post-tool git status error:', err);
              }
            })();
          "`,
              timeout: 3000,
            },
          ],
        },
      ],
    };
  },
};

export default gitWorkflowHook;
export { GitWorkflowHook, type GitWorkflowConfig };

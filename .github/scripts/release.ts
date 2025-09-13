#!/usr/bin/env tsx

// ==============================================================================
// Claude Good Hooks - Release Script
// ==============================================================================
//
// OVERVIEW:
// This script initiates the release process for the Claude Good Hooks monorepo
// by creating and pushing a git tag. The actual package building and publishing
// is handled automatically by GitHub Actions.
//
// AUTOMATION WORKFLOW:
// 1. Developer runs this script locally: tsx .github/scripts/release.ts 1.2.3
// 2. Script validates environment and creates git tag "v1.2.3"
// 3. Script pushes tag to GitHub repository
// 4. GitHub Actions "Release" workflow (.github/workflows/release.yml) triggers
// 5. GitHub Actions handles building, version updating, and npm publishing
//
// GITHUB ACTIONS INTEGRATION:
// - Workflow: .github/workflows/release.yml
// - Trigger: Push of tags matching pattern "v*"
// - Environment: ubuntu-latest with Node.js 20.x and pnpm 10.12.4
// - Required Secrets:
//   - NPM_TOKEN: For publishing packages to npm registry
//   - GITHUB_TOKEN: Automatically provided for creating GitHub releases
//
// EXECUTION CONTEXT:
// - Manual execution: Run locally by developers to initiate releases
// - NOT run by CI/CD: This script runs locally, CI handles the actual release
// - Prerequisites: Clean working directory, main branch, network access
//
// PUBLISHED PACKAGES:
// The GitHub Action publishes these packages to npm:
// - claude-good-hooks-cli
// - claude-good-hooks-types  
// - dirty-hook
// - claude-good-hooks-template-hook
//
// ERROR HANDLING:
// - Validates semver format (x.y.z)
// - Checks for clean working directory
// - Verifies main branch (with override option)
// - Runs tests and build before tagging
// - Provides clear error messages and exit codes
//
// USAGE:
// tsx .github/scripts/release.ts <version>
// 
// EXAMPLES:
// tsx .github/scripts/release.ts 1.2.3          # Release version 1.2.3
// tsx .github/scripts/release.ts 2.0.0-beta.1   # Not supported - only stable releases
//
// ==============================================================================

import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

// ==============================================================================
// Types and Interfaces
// ==============================================================================

interface ReleaseConfig {
  version: string;
  skipBranchCheck?: boolean;
}

interface GitStatus {
  isClean: boolean;
  currentBranch: string;
  hasRemoteOrigin: boolean;
  tagExists: boolean;
  remoteTagExists: boolean;
}

interface ValidationResult {
  success: boolean;
  error?: string;
}

// ==============================================================================
// Error Classes
// ==============================================================================

class ReleaseError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = 'ReleaseError';
  }
}

class ValidationError extends ReleaseError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'ValidationError';
  }
}

class GitError extends ReleaseError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'GitError';
  }
}

class BuildError extends ReleaseError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'BuildError';
  }
}

// ==============================================================================
// Utility Functions
// ==============================================================================

/**
 * Log a message with emoji prefix for better UX
 */
function log(emoji: string, message: string): void {
  console.log(`${emoji} ${message}`);
}

/**
 * Log an error message with red styling
 */
function logError(message: string): void {
  console.log(`❌ Error: ${message}`);
}

/**
 * Execute a shell command and return the output
 */
function execCommand(command: string, silent: boolean = false): string {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result.toString().trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute a shell command and return success status
 */
function execCommandSafe(command: string, silent: boolean = true): boolean {
  try {
    execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask user for confirmation
 */
async function askConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ==============================================================================
// Validation Functions
// ==============================================================================

/**
 * Validate that we're not running in CI
 */
function validateNotInCI(): ValidationResult {
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return {
      success: false,
      error: "This script is intended for local execution only.\n" +
             "   It should not be run in CI/CD environments.\n" +
             "   The GitHub Actions workflow handles the actual release process."
    };
  }
  return { success: true };
}

/**
 * Validate version format (stable semver only)
 */
function validateVersion(version: string): ValidationResult {
  const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
  
  if (!semverRegex.test(version)) {
    return {
      success: false,
      error: `Version must be in stable semver format x.y.z\n` +
             `   Provided: ${version}\n` +
             `   Examples: 1.2.3, 2.0.0, 1.10.5\n` +
             `   Note: Pre-release versions (beta, alpha, rc) are not supported by this script`
    };
  }
  
  return { success: true };
}

/**
 * Validate required tools are installed
 */
function validateTools(): ValidationResult {
  const tools = [
    { command: 'git', name: 'git', installMsg: 'Install from https://git-scm.com/' },
    { command: 'pnpm', name: 'pnpm', installMsg: 'Install with: npm install -g pnpm' }
  ];

  for (const tool of tools) {
    if (!execCommandSafe(`command -v ${tool.command}`)) {
      return {
        success: false,
        error: `${tool.name} is required but not installed\n   ${tool.installMsg}`
      };
    }
  }

  return { success: true };
}

/**
 * Get git repository status
 */
function getGitStatus(version: string): GitStatus {
  // Check if in git repository
  if (!execCommandSafe('git rev-parse --git-dir')) {
    throw new GitError('Not in a git repository');
  }

  // Check if remote origin exists
  const hasRemoteOrigin = execCommandSafe('git remote get-url origin');
  if (!hasRemoteOrigin) {
    throw new GitError('Git remote \'origin\' is not configured\n   This is required to push the release tag');
  }

  // Get current branch
  const currentBranch = execCommand('git branch --show-current', true);

  // Check if working directory is clean
  const isClean = execCommandSafe('git diff-index --quiet HEAD --');

  // Check if tag exists locally
  const tagExists = execCommandSafe(`git tag -l | grep -q "^v${version}$"`);

  // Check if tag exists on remote
  const remoteTagExists = execCommandSafe(`git ls-remote --tags origin | grep -q "refs/tags/v${version}$"`);

  return {
    isClean,
    currentBranch,
    hasRemoteOrigin,
    tagExists,
    remoteTagExists
  };
}

/**
 * Validate git repository state
 */
async function validateGitState(version: string, skipBranchCheck: boolean = false): Promise<void> {
  const gitStatus = getGitStatus(version);

  // Check working directory cleanliness
  if (!gitStatus.isClean) {
    const statusOutput = execCommand('git status --porcelain', true);
    throw new GitError(`Working directory is not clean. Please commit your changes first.\n\nUncommitted changes:\n${statusOutput}`);
  }

  // Check current branch
  if (!skipBranchCheck && gitStatus.currentBranch !== 'main') {
    log('⚠️', `Warning: You're not on the main branch (current: ${gitStatus.currentBranch})`);
    const shouldContinue = await askConfirmation('Continue anyway?');
    if (!shouldContinue) {
      process.exit(1);
    }
  }

  // Check if tag already exists locally
  if (gitStatus.tagExists) {
    throw new GitError(`Tag v${version} already exists locally\n   Use: git tag -d v${version}  # to delete local tag`);
  }

  // Check if tag already exists on remote
  if (gitStatus.remoteTagExists) {
    throw new GitError(`Tag v${version} already exists on remote\n   This version has already been released`);
  }
}

// ==============================================================================
// Build and Test Functions
// ==============================================================================

/**
 * Pull latest changes from remote
 */
function pullLatestChanges(): void {
  log('📡', 'Pulling latest changes from origin/main...');
  
  try {
    execCommand('git pull origin main');
  } catch (error: any) {
    throw new GitError(`Failed to pull latest changes from origin/main\n   Please resolve any merge conflicts and try again\n\n${error.message}`);
  }
}

/**
 * Install dependencies
 */
function installDependencies(): void {
  log('📦', 'Installing dependencies...');
  
  try {
    execCommand('pnpm install --frozen-lockfile');
  } catch (error: any) {
    throw new BuildError(`Failed to install dependencies\n   Check your pnpm-lock.yaml file and try again\n\n${error.message}`);
  }
}

/**
 * Run tests
 */
function runTests(): void {
  log('🧪', 'Running tests...');
  
  try {
    execCommand('pnpm test');
  } catch (error: any) {
    throw new BuildError(`Tests failed\n   All tests must pass before creating a release\n\n${error.message}`);
  }
}

/**
 * Build packages
 */
function buildPackages(): void {
  log('🔨', 'Building packages...');
  
  try {
    execCommand('pnpm build');
  } catch (error: any) {
    throw new BuildError(`Build failed\n   All packages must build successfully before creating a release\n\n${error.message}`);
  }
}

// ==============================================================================
// Git Operations
// ==============================================================================

/**
 * Create and push git tag
 */
function createAndPushTag(version: string): void {
  log('🏷️', `Creating tag v${version}...`);
  
  try {
    execCommand(`git tag "v${version}"`);
  } catch (error: any) {
    throw new GitError(`Failed to create tag v${version}\n\n${error.message}`);
  }

  log('📤', 'Pushing tag to trigger release workflow...');
  
  try {
    execCommand(`git push origin "v${version}"`);
  } catch (error: any) {
    throw new GitError(
      `Failed to push tag to remote\n` +
      `   Tag created locally but not pushed. You may need to:\n` +
      `   - Check your network connection\n` +
      `   - Verify you have push permissions to the repository\n` +
      `   - Manually push with: git push origin v${version}\n\n${error.message}`
    );
  }
}

// ==============================================================================
// Main Release Function
// ==============================================================================

/**
 * Execute the release process
 */
async function executeRelease(config: ReleaseConfig): Promise<void> {
  const { version, skipBranchCheck } = config;

  try {
    // Environment validation
    log('🔍', 'Validating environment...');
    
    const ciValidation = validateNotInCI();
    if (!ciValidation.success) {
      throw new ValidationError(ciValidation.error!);
    }

    const versionValidation = validateVersion(version);
    if (!versionValidation.success) {
      throw new ValidationError(versionValidation.error!);
    }

    const toolsValidation = validateTools();
    if (!toolsValidation.success) {
      throw new ValidationError(toolsValidation.error!);
    }

    // Git state validation
    await validateGitState(version, skipBranchCheck);

    // Prepare release
    log('🚀', `Preparing release v${version}`);
    
    pullLatestChanges();
    installDependencies();
    runTests();
    buildPackages();

    // Create and push tag
    createAndPushTag(version);

    // Success message
    console.log('');
    log('✅', `Release v${version} successfully initiated!`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Monitor the GitHub Actions workflow at:');
    console.log('      https://github.com/sammons2/claude-good-hooks/actions');
    console.log('');
    console.log('   2. The workflow will automatically:');
    console.log(`      • Update package.json versions to ${version}`);
    console.log('      • Build all packages');
    console.log('      • Run tests in the CI environment');
    console.log('      • Publish to npm registry:');
    console.log('        - claude-good-hooks-cli');
    console.log('        - claude-good-hooks-types');
    console.log('        - dirty-hook');
    console.log('        - claude-good-hooks-template-hook');
    console.log('      • Create a GitHub release with auto-generated notes');
    console.log('');
    console.log('   3. If the workflow fails, check the logs and address any issues');
    console.log('');
    console.log('🎉 Release process complete! The packages will be available on npm shortly.');

  } catch (error: unknown) {
    if (error instanceof ReleaseError) {
      logError(error.message);
      process.exit(error.exitCode);
    } else if (error instanceof Error) {
      logError(`Unexpected error: ${error.message}`);
      process.exit(1);
    } else {
      logError('An unknown error occurred');
      process.exit(1);
    }
  }
}

// ==============================================================================
// CLI Setup
// ==============================================================================

const program = new Command();

program
  .name('release')
  .description('Initiate the release process for Claude Good Hooks monorepo')
  .version('1.0.0')
  .argument('<version>', 'Version to release (e.g., 1.2.3)')
  .option('--skip-branch-check', 'Skip the main branch requirement check')
  .action(async (version: string, options) => {
    const config: ReleaseConfig = {
      version,
      skipBranchCheck: options.skipBranchCheck
    };

    await executeRelease(config);
  });

program
  .configureHelp({
    afterAll: section => section + `
📋 This script will:
   1. Validate the environment and version format
   2. Run tests and build the packages
   3. Create and push a git tag
   4. Trigger the automated GitHub Actions release workflow

📖 For more details, see the header comments in this script
`
  });

// Parse CLI arguments
program.parse();
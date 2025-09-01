import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function doctorCommand(options: any): Promise<void> {
  const isJson = options.parent?.json;
  const checks: Array<{ name: string; status: boolean; message?: string }> = [];

  // Check if claude-good-hooks is in PATH
  try {
    execSync('which claude-good-hooks', { encoding: 'utf-8' });
    checks.push({ name: 'claude-good-hooks in PATH', status: true });
  } catch {
    checks.push({
      name: 'claude-good-hooks in PATH',
      status: false,
      message:
        'claude-good-hooks not found in PATH. Install globally with: npm install -g @sammons/claude-good-hooks',
    });
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  const nodeOk = majorVersion >= 20;
  checks.push({
    name: 'Node.js version',
    status: nodeOk,
    message: nodeOk ? `v${nodeVersion}` : `v${nodeVersion} (requires Node.js 20+)`,
  });

  // Check for Claude settings directory
  const claudeDir = join(homedir(), '.claude');
  const claudeDirExists = existsSync(claudeDir);
  checks.push({
    name: 'Claude settings directory',
    status: claudeDirExists,
    message: claudeDirExists ? claudeDir : 'Claude Code may not be installed',
  });

  // Check for global settings file
  const globalSettingsPath = join(claudeDir, 'settings.json');
  const globalSettingsExists = existsSync(globalSettingsPath);
  checks.push({
    name: 'Global settings file',
    status: globalSettingsExists,
    message: globalSettingsExists ? 'Found' : 'Not found (will be created when needed)',
  });

  // Check for project settings
  const projectClaudeDir = join(process.cwd(), '.claude');
  const projectSettingsExists = existsSync(join(projectClaudeDir, 'settings.json'));
  checks.push({
    name: 'Project settings',
    status: projectSettingsExists,
    message: projectSettingsExists ? 'Found' : 'Not found (will be created when needed)',
  });

  // Check npm/pnpm
  try {
    execSync('npm --version', { encoding: 'utf-8' });
    checks.push({ name: 'npm available', status: true });
  } catch {
    checks.push({
      name: 'npm available',
      status: false,
      message: 'npm not found. Please install Node.js/npm',
    });
  }

  if (isJson) {
    console.log(JSON.stringify({ checks }, null, 2));
  } else {
    console.log(chalk.bold('\nSystem Check:\n'));

    for (const check of checks) {
      const status = check.status ? chalk.green('✓') : chalk.red('✗');
      const message = check.message ? chalk.dim(` - ${check.message}`) : '';
      console.log(`${status} ${check.name}${message}`);
    }

    const allPassed = checks.every(c => c.status);
    console.log();
    if (allPassed) {
      console.log(chalk.green('All checks passed!'));
    } else {
      console.log(chalk.yellow('Some checks failed. Please address the issues above.'));
    }
  }
}

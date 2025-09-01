import type { IFileSystemService, IProcessService } from '../interfaces/index.js';

export interface SystemCheck {
  name: string;
  status: boolean;
  message?: string;
}

export interface DoctorReport {
  checks: SystemCheck[];
  allPassed: boolean;
}

export interface IDoctorService {
  runSystemCheck(): DoctorReport;
}

export class DoctorService implements IDoctorService {
  constructor(
    private fileSystem: IFileSystemService,
    private process: IProcessService
  ) {}

  runSystemCheck(): DoctorReport {
    const checks: SystemCheck[] = [];

    // Check if claude-good-hooks is in PATH
    try {
      this.process.execSync('which claude-good-hooks');
      checks.push({ name: 'claude-good-hooks in PATH', status: true });
    } catch {
      checks.push({
        name: 'claude-good-hooks in PATH',
        status: false,
        message: 'claude-good-hooks not found in PATH. Install globally with: npm install -g @sammons/claude-good-hooks',
      });
    }

    // Check Node.js version
    const nodeVersion = this.process.getVersion();
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    const nodeOk = majorVersion >= 20;
    checks.push({
      name: 'Node.js version',
      status: nodeOk,
      message: nodeOk ? nodeVersion : `${nodeVersion} (requires Node.js 20+)`,
    });

    // Check for Claude settings directory
    const claudeDir = this.fileSystem.join(this.fileSystem.homedir(), '.claude');
    const claudeDirExists = this.fileSystem.exists(claudeDir);
    checks.push({
      name: 'Claude settings directory',
      status: claudeDirExists,
      message: claudeDirExists ? claudeDir : 'Claude Code may not be installed',
    });

    // Check for global settings file
    const globalSettingsPath = this.fileSystem.join(claudeDir, 'settings.json');
    const globalSettingsExists = this.fileSystem.exists(globalSettingsPath);
    checks.push({
      name: 'Global settings file',
      status: globalSettingsExists,
      message: globalSettingsExists ? 'Found' : 'Not found (will be created when needed)',
    });

    // Check for project settings
    const projectClaudeDir = this.fileSystem.join(this.fileSystem.cwd(), '.claude');
    const projectSettingsExists = this.fileSystem.exists(
      this.fileSystem.join(projectClaudeDir, 'settings.json')
    );
    checks.push({
      name: 'Project settings',
      status: projectSettingsExists,
      message: projectSettingsExists ? 'Found' : 'Not found (will be created when needed)',
    });

    // Check npm/pnpm
    try {
      this.process.execSync('npm --version');
      checks.push({ name: 'npm available', status: true });
    } catch {
      checks.push({
        name: 'npm available',
        status: false,
        message: 'npm not found. Please install Node.js/npm',
      });
    }

    const allPassed = checks.every(c => c.status);

    return { checks, allPassed };
  }
}
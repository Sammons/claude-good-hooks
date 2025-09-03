import { spawn, exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Simple process service that wraps Node.js process operations
 */
export class ProcessService {
  exit(code: number): never {
    process.exit(code);
  }

  async exec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
    return await execAsync(command, { cwd });
  }

  execSync(command: string): string {
    return execSync(command, { encoding: 'utf8' });
  }

  spawn(command: string, args: string[], options?: any) {
    return spawn(command, args, options);
  }

  get env() {
    return process.env;
  }

  get platform() {
    return process.platform;
  }

  get cwd() {
    return process.cwd();
  }
}
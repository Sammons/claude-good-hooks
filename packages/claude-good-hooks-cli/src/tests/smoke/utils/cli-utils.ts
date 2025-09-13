import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

// Get the path to the CLI executable
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../../../../dist/index.mjs');

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function runCLI(
  args: string[],
  options: { timeout?: number; expectError?: boolean } = {}
): Promise<CLIResult> {
  const { timeout = 10000, expectError = false } = options;

  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_PATH, ...args], {
      timeout,
      encoding: 'utf8',
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      success: true,
    };
  } catch (error: unknown) {
    // Type guard to check if error has expected properties
    const isExecError = (
      err: unknown
    ): err is { code?: string | number; stdout?: string; stderr?: string } => {
      return typeof err === 'object' && err !== null;
    };

    // For expected errors (like invalid commands), we still want to capture the output
    if (isExecError(error) && (expectError || error.code === 1)) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
        exitCode: typeof error.code === 'number' ? error.code : 1,
        success: false,
      };
    }

    // For unexpected errors (like timeouts), re-throw
    if (isExecError(error) && error.code === 'ETIMEDOUT') {
      throw new Error(
        `CLI command timed out after ${timeout}ms: node ${CLI_PATH} ${args.join(' ')}`
      );
    }

    throw error;
  }
}

export function expectValidJSON(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    throw new Error(`Expected valid JSON, got: ${jsonString}`);
  }
}

export function expectNonEmptyOutput(output: string, description: string): void {
  if (!output || output.trim().length === 0) {
    throw new Error(`Expected non-empty ${description}, got empty output`);
  }
}

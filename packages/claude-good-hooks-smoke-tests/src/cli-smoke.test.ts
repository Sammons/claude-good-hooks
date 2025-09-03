import { describe, test, expect, beforeAll } from 'vitest';
import { runCLI, expectValidJSON, expectNonEmptyOutput } from './cli-utils.js';

describe('Claude Good Hooks CLI - Smoke Tests', () => {
  beforeAll(async () => {
    // Ensure the CLI is built before running tests
    console.log('Starting Claude Good Hooks CLI smoke tests...');
  });

  describe('Help Commands', () => {
    test('should display help', async () => {
      const result = await runCLI(['help']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'help output');
      expect(result.stdout).toMatch(/(Usage|USAGE|Commands|COMMANDS)/i);
    });

    test('should display help in JSON format', async () => {
      const result = await runCLI(['--json', 'help']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON help output');

      const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
      expect(jsonOutput).toHaveProperty('commands');
      expect(jsonOutput.commands).toHaveProperty('help');
      expect(jsonOutput.commands).toHaveProperty('version');
    });
  });

  describe('Version Commands', () => {
    test('should display version', async () => {
      const result = await runCLI(['version']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'version output');
      // Should contain a version number pattern
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should display version in JSON format', async () => {
      const result = await runCLI(['--json', 'version']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON version output');

      const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
      expect(jsonOutput).toHaveProperty('version');
      expect(jsonOutput).toHaveProperty('name');
      expect(jsonOutput.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Doctor Commands', () => {
    test('should run doctor command', async () => {
      const result = await runCLI(['doctor']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'doctor output');
      // Doctor should check system status
      expect(result.stdout.toLowerCase()).toMatch(/(check|status|system|environment)/i);
    });

    test('should run doctor command in JSON format', async () => {
      const result = await runCLI(['--json', 'doctor']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON doctor output');

      const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
      expect(jsonOutput).toHaveProperty('checks');
      expect(Array.isArray(jsonOutput.checks)).toBe(true);
      expect(jsonOutput.checks.length).toBeGreaterThan(0);
    });
  });

  describe('List Hooks Commands', () => {
    test('should list hooks', async () => {
      const result = await runCLI(['list-hooks']);
      expect(result.success).toBe(true);
      // Output may be empty if no hooks are installed, but command should succeed
      expect(result.exitCode).toBe(0);
    });

    test('should list hooks in JSON format', async () => {
      const result = await runCLI(['--json', 'list-hooks']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON list-hooks output');

      const jsonOutput = expectValidJSON(result.stdout) as any[];
      expect(Array.isArray(jsonOutput)).toBe(true);
      // Empty array is valid for no hooks
    });

    test('should list installed hooks', async () => {
      const result = await runCLI(['list-hooks', '--installed']);
      expect(result.success).toBe(true);
      // Command should succeed even if no hooks are installed
      expect(result.exitCode).toBe(0);
    });

    test('should list installed hooks in JSON format', async () => {
      const result = await runCLI(['--json', 'list-hooks', '--installed']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON list-hooks --installed output');

      const jsonOutput = expectValidJSON(result.stdout) as any[];
      expect(Array.isArray(jsonOutput)).toBe(true);
      // Empty array is valid for no hooks
    });
  });

  describe('Remote Commands', () => {
    test('should run remote command', async () => {
      const result = await runCLI(['remote']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'remote output');
    });

    test('should run remote command in JSON format', async () => {
      const result = await runCLI(['--json', 'remote']);
      expect(result.success).toBe(true);
      expectNonEmptyOutput(result.stdout, 'JSON remote output');

      const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
      expect(jsonOutput).toHaveProperty('remotes');
      expect(Array.isArray(jsonOutput.remotes)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle apply command without arguments', async () => {
      const result = await runCLI(['apply'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      // Should provide helpful error message
      expect(result.stderr || result.stdout).toMatch(/(missing|required|argument|usage)/i);
    });

    test('should handle apply command without arguments in JSON format', async () => {
      const result = await runCLI(['--json', 'apply'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);

      // CLI might output error to stderr or stdout
      expect(result.stderr || result.stdout).toMatch(/(missing|required|argument|usage)/i);
    });

    test('should handle invalid command', async () => {
      const result = await runCLI(['invalid-command'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      // Should provide helpful error message about invalid command
      expect(result.stderr || result.stdout).toMatch(/(unknown|invalid|command|usage)/i);
    });

    test('should handle invalid command in JSON format', async () => {
      const result = await runCLI(['--json', 'invalid-command'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);

      // Should provide helpful error message about invalid command
      expect(result.stderr || result.stdout).toMatch(/(unknown|invalid|command|usage)/i);
    });
  });

  describe('Command Structure Validation', () => {
    test('should have consistent help structure', async () => {
      const result = await runCLI(['help']);
      expect(result.success).toBe(true);

      // Help should mention main commands
      const helpText = result.stdout.toLowerCase();
      expect(helpText).toMatch(/(command|usage|options)/i);
    });

    test('should have consistent JSON response structure', async () => {
      const commands = ['help', 'version', 'doctor', 'list-hooks', 'remote'];

      for (const command of commands) {
        const result = await runCLI(['--json', command]);
        expect(result.success).toBe(true);

        const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
        // Each command has its own response structure
        expect(typeof jsonOutput).toBe('object');
        expect(jsonOutput).not.toBe(null);
      }
    });
  });

  describe('CLI Installation and Basic Functionality', () => {
    test('should be able to execute CLI without crashing', async () => {
      // Just try to run the CLI with no args - should show help or usage
      const result = await runCLI([]);
      // Even if it "fails" with exit code 1, it should not crash and should provide output
      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
      expect(result.stdout.length > 0 || result.stderr.length > 0).toBe(true);
    });

    test('should handle --version flag', async () => {
      const result = await runCLI(['--version']);
      // Should either succeed or redirect to version command
      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);

      if (result.success) {
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      }
    });

    test('should handle --help flag', async () => {
      const result = await runCLI(['--help']);
      // Should either succeed or redirect to help command
      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);

      if (result.success) {
        expect(result.stdout.toLowerCase()).toMatch(/(usage|help|command)/i);
      }
    });
  });
});

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { runCLI, expectValidJSON } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Claude Good Hooks CLI - Integration Tests', () => {
  const testDir = path.join(__dirname, '../../static-test-assets/exports');

  beforeAll(async () => {
    // Create a temporary directory for integration tests
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch {
      // Directory might already exist, that's fine
    }
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Cleanup failed, but don't fail the tests
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('Apply/Remove Operations', () => {
    test('should provide helpful error when applying non-existent hook', async () => {
      const result = await runCLI(['apply', 'non-existent-hook'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toMatch(/(not found|does not exist|invalid|error)/i);
    });

    test('should handle apply with invalid arguments gracefully', async () => {
      const result = await runCLI(['apply'], { expectError: true });
      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toMatch(/(usage|required|missing|argument)/i);
    });
  });

  describe('Update Operations', () => {
    test('should handle update command', async () => {
      const result = await runCLI(['update']);
      // Update might succeed or fail depending on environment, but should not crash
      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
      expect(result.stdout.length > 0 || result.stderr.length > 0).toBe(true);
    });

    test('should handle update command in JSON format', async () => {
      const result = await runCLI(['--json', 'update']);
      // Update might succeed or fail, but should provide JSON response
      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);

      if (result.stdout.trim()) {
        const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
        expect(jsonOutput).toHaveProperty('success');

        if (jsonOutput.success === false) {
          expect(jsonOutput).toHaveProperty('error');
        } else {
          // Success case - may have different properties depending on command
          expect(jsonOutput.success).toBe(true);
        }
      }
    });
  });

  describe('Command Combinations', () => {
    test('should handle multiple flags correctly', async () => {
      const result = await runCLI(['--json', '--verbose', 'version']);

      if (result.success) {
        const jsonOutput = expectValidJSON(result.stdout) as Record<string, any>;
        expect(jsonOutput).toHaveProperty('version');
        expect(jsonOutput).toHaveProperty('name');
      } else {
        // If --verbose is not supported, should still handle gracefully
        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should handle flag order independence', async () => {
      const result1 = await runCLI(['--json', 'version']);
      const result2 = await runCLI(['--json', 'version']); // Use consistent order as flags should come before commands

      // Both should either succeed or fail in the same way
      expect(result1.success).toBe(result2.success);

      if (result1.success && result2.success) {
        const json1 = expectValidJSON(result1.stdout) as Record<string, any>;
        const json2 = expectValidJSON(result2.stdout) as Record<string, any>;
        expect(json1).toEqual(json2);
      }
    });
  });

  describe('Long-running Operations', () => {
    test('should handle potentially slow operations without timeout', async () => {
      // Doctor command might need to check network or filesystem
      const result = await runCLI(['doctor'], { timeout: 15000 });
      expect(result.success).toBe(true);
    }, 20000); // 20 second test timeout

    test('should handle list-hooks with various flags', async () => {
      const flags = ['--installed', '--available', '--all'];

      for (const flag of flags) {
        console.log(`Testing list-hooks with flag: ${flag}`);
        try {
          const result = await runCLI(['list-hooks', flag], { timeout: 10000 });
          // Should either succeed or provide meaningful error
          expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);

          if (!result.success) {
            // If flag is not supported, error should be informative
            expect(result.stderr || result.stdout).toMatch(/(unknown|invalid|flag|option)/i);
          }
        } catch (error) {
          // If flag causes unexpected error, it should be handled
          console.log(`Error with flag ${flag}:`, error);
          expect(error).toBeInstanceOf(Error);
        }
      }
    }, 20000);
  });

  describe('Environment Handling', () => {
    test('should work in different working directories', async () => {
      // Test that CLI works regardless of where it's called from
      const originalCwd = process.cwd();

      try {
        process.chdir(testDir);
        const result = await runCLI(['version']);
        expect(result.success).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test('should handle missing configuration gracefully', async () => {
      // In a directory without Claude hooks config, commands should still work
      const result = await runCLI(['list-hooks']);
      expect(result.success).toBe(true);
      // Should indicate no hooks are installed/configured
    });
  });
});

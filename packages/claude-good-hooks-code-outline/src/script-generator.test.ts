import { describe, it, expect } from 'vitest';
import { generateCodeOutlineScript } from './script-generator';

describe('script-generator', () => {
  describe('generateCodeOutlineScript', () => {
    it('should generate script with ASCII format', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.ts'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
        compress: false,
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('#!/usr/bin/env node');
      expect(script).toContain('--format ascii');
      expect(script).toContain('["**/*.ts"]');
      expect(script).toContain('execSync');
    });

    it('should generate script with JSON format and depth', () => {
      const params = {
        format: 'json' as const,
        depth: 3,
        includeAll: true,
        patterns: ['**/*.{js,ts}', '!node_modules/**'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
        compress: false,
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('--format ascii'); // Always ascii because it's the base format
      expect(script).toContain('--depth 3');
      expect(script).toContain('--include-all');
      expect(script).toContain('["**/*.{js,ts}","!node_modules/**"]');
    });

    it('should generate script with compressed format', () => {
      const params = {
        format: 'compressed' as const,
        includeAll: false,
        patterns: ['**/*.tsx'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
        compress: true,
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('compressOutline');
      expect(script).toContain('ABBREVIATIONS');
      expect(script).toContain('CODE STRUCTURE OUTLINE');
    });

    it('should handle multiple patterns correctly', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.{js,ts,jsx,tsx}', '!node_modules/**', '!dist/**', '!build/**'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('"**/*.{js,ts,jsx,tsx}"');
      expect(script).toContain('"!node_modules/**"');
      expect(script).toContain('"!dist/**"');
      expect(script).toContain('"!build/**"');
    });

    it('should include proper error handling', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.ts'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('catch (error)');
      expect(script).toContain('process.exit(1)');
      expect(script).toContain('No files found matching the specified patterns');
      expect(script).toContain('Error generating code outline:');
    });

    it('should use execSync for running code-outline-cli', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.ts'],
        modulePath: '/custom/path/node_modules/@sammons',
        settingsPath: '/test/settings',
        compress: false,
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('execSync');
      expect(script).toContain('npx @sammons/code-outline-cli');
    });

    it('should use default depth when not specified', () => {
      const params = {
        format: 'json' as const,
        includeAll: true,
        patterns: ['**/*.ts'],
        modulePath: '/path/to/node_modules/@sammons',
        settingsPath: '/test/settings',
        compress: false,
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('--depth 2'); // default depth is 2
    });
  });
});

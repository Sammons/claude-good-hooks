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
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('#!/usr/bin/env node');
      expect(script).toContain("new Formatter('ascii')");
      expect(script).toContain('const { FileProcessor }');
      expect(script).toContain('const { Formatter }');
      expect(script).toContain('["**/*.ts"]');
      expect(script).toContain('true // includeAll=false means namedOnly=true');
    });

    it('should generate script with JSON format and depth', () => {
      const params = {
        format: 'json' as const,
        depth: 3,
        includeAll: true,
        patterns: ['**/*.{js,ts}', '!node_modules/**'],
        modulePath: '/path/to/node_modules/@sammons',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain("new Formatter('json')");
      expect(script).toContain('3,'); // depth parameter
      expect(script).toContain('false // includeAll=false means namedOnly=true');
      expect(script).toContain('["**/*.{js,ts}","!node_modules/**"]');
    });

    it('should generate script with YAML format', () => {
      const params = {
        format: 'yaml' as const,
        includeAll: false,
        patterns: ['**/*.tsx'],
        modulePath: '/path/to/node_modules/@sammons',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain("new Formatter('yaml')");
      expect(script).toContain('true // includeAll=false means namedOnly=true');
    });

    it('should handle multiple patterns correctly', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.{js,ts,jsx,tsx}', '!node_modules/**', '!dist/**', '!build/**'],
        modulePath: '/path/to/node_modules/@sammons',
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
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('catch (error)');
      expect(script).toContain('process.exit(1)');
      expect(script).toContain('No files found matching the specified patterns');
      expect(script).toContain('Error generating code outline:');
    });

    it('should use absolute module paths', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        patterns: ['**/*.ts'],
        modulePath: '/custom/path/node_modules/@sammons',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain("require('/custom/path/node_modules/@sammons/code-outline-cli/dist/file-processor')");
      expect(script).toContain("require('/custom/path/node_modules/@sammons/code-outline-formatter')");
    });

    it('should use default depth when not specified', () => {
      const params = {
        format: 'json' as const,
        includeAll: true,
        patterns: ['**/*.ts'],
        modulePath: '/path/to/node_modules/@sammons',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('10,'); // default depth
      expect(script).toContain('processor.processFiles');
    });
  });
});
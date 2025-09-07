import { describe, it, expect } from 'vitest';
import { generateCodeOutlineScript } from './script-generator';

describe('script-generator', () => {
  describe('generateCodeOutlineScript', () => {
    it('should generate script with ASCII format', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        projectPath: '/test/project',
        patterns: ['**/*.ts'],
        projectDescription: 'TypeScript project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('#!/usr/bin/env node');
      expect(script).toContain("'--format', 'ascii'");
      expect(script).toContain('TypeScript project');
      expect(script).toContain('["**/*.ts"]');
      expect(script).not.toContain('--all');
      expect(script).not.toContain('--depth');
    });

    it('should generate script with JSON format and depth', () => {
      const params = {
        format: 'json' as const,
        depth: 3,
        includeAll: true,
        projectPath: '/test/project',
        patterns: ['**/*.{js,ts}', '!node_modules/**'],
        projectDescription: 'Mixed project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain("'--format', 'json'");
      expect(script).toContain("'--depth', '3'");
      expect(script).toContain("'--all'");
      expect(script).toContain('["**/*.{js,ts}","!node_modules/**"]');
      expect(script).toContain('Mixed project');
    });

    it('should generate script with YAML format', () => {
      const params = {
        format: 'yaml' as const,
        includeAll: false,
        projectPath: '/test/project',
        patterns: ['**/*.tsx'],
        projectDescription: 'React TypeScript project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain("'--format', 'yaml'");
      expect(script).toContain('React TypeScript project');
      expect(script).not.toContain('--all');
    });

    it('should handle multiple patterns correctly', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        projectPath: '/test/project',
        patterns: ['**/*.{js,ts,jsx,tsx}', '!node_modules/**', '!dist/**', '!build/**'],
        projectDescription: 'Full-stack project',
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
        projectPath: '/test/project',
        patterns: ['**/*.ts'],
        projectDescription: 'TypeScript project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('catch (error)');
      expect(script).toContain('SIGINT');
      expect(script).toContain('SIGTERM');
      expect(script).toContain('process.exit');
      expect(script).toContain('No files found');
      expect(script).toContain('timed out');
    });

    it('should include installation logic', () => {
      const params = {
        format: 'ascii' as const,
        includeAll: false,
        projectPath: '/test/project',
        patterns: ['**/*.ts'],
        projectDescription: 'TypeScript project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('checkCodeOutlineAvailability');
      expect(script).toContain('ensureCodeOutlineInstalled');
      expect(script).toContain('npm install -g @sammons/code-outline-cli');
      expect(script).toContain('code-outline-cli installed successfully');
    });

    it('should include proper logging and output formatting', () => {
      const params = {
        format: 'json' as const,
        depth: 5,
        includeAll: true,
        projectPath: '/test/project',
        patterns: ['**/*.ts'],
        projectDescription: 'TypeScript project',
      };

      const script = generateCodeOutlineScript(params);

      expect(script).toContain('🔍 Analyzing codebase structure');
      expect(script).toContain('📁 Project Type:');
      expect(script).toContain('🚀 Running: npx');
      expect(script).toContain('✅ Code outline generated successfully');
      expect(script).toContain('📊 Format: JSON');
      expect(script).toContain('Depth: 5');
      expect(script).toContain('All nodes included');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { generateSearchInterceptScript } from './search-script-generator';

describe('search-script-generator', () => {
  describe('generateSearchInterceptScript', () => {
    it('should generate script with proper structure', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 3,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain('#!/usr/bin/env node');
      expect(script).toContain('process.stdin.setEncoding');
      expect(script).toContain('JSON.parse(inputData)');
      expect(script).toContain("tool_name === 'Glob'");
      expect(script).toContain("tool_name === 'Grep'");
    });

    it('should include settings path in script', () => {
      const params = {
        settingsPath: '/custom/path/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain('/custom/path/settings');
      expect(script).toContain('code-outline.md');
      expect(script).toContain('last-search-outline.md');
    });

    it('should use specified depth for code-outline-cli', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 5,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain('--depth 5');
    });

    it('should handle Glob tool interception', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain("if (tool_name === 'Glob')");
      expect(script).toContain('tool_input.pattern');
      expect(script).toContain('npx @sammons/code-outline-cli --format compressed');
      expect(script).toContain('Enhancing Glob search');
    });

    it('should handle Grep tool interception', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain("if (tool_name === 'Grep')");
      expect(script).toContain('Analyzing code structure for Grep search');
      expect(script).toContain('fs.readFileSync(outlinePath');
      expect(script).toContain('relevantSections');
    });

    it('should include error handling', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain('try {');
      expect(script).toContain('catch (error)');
      expect(script).toContain('process.exit(0)');
      expect(script).toContain('Search intercept hook error:');
    });

    it('should output JSON for hook-specific output', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      expect(script).toContain('hookSpecificOutput');
      expect(script).toContain('hookEventName: "PreToolUse"');
      expect(script).toContain('additionalContext');
      expect(script).toContain('console.log(JSON.stringify(output))');
    });

    it('should exit gracefully on errors', () => {
      const params = {
        settingsPath: '/test/settings',
        depth: 2,
      };

      const script = generateSearchInterceptScript(params);

      // Should have multiple exit(0) calls for graceful handling
      const exitMatches = script.match(/process\.exit\(0\)/g);
      expect(exitMatches).toBeTruthy();
      expect(exitMatches!.length).toBeGreaterThan(2);
    });
  });
});

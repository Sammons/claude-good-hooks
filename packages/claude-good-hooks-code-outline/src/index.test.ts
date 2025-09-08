import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import codeOutlineHook from './index';

describe('code-outline hook', () => {
  let tempDir: string;
  let settingsDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-outline-hook-test-'));
    settingsDir = path.join(tempDir, '.claude');
    fs.mkdirSync(settingsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('plugin structure', () => {
    it('should be a valid HookPlugin', () => {
      expect(codeOutlineHook).toBeDefined();
      expect(codeOutlineHook.name).toBe('code-outline');
      expect(codeOutlineHook.description).toContain('code structure outline');
      expect(codeOutlineHook.version).toBe('1.0.0');
      expect(typeof codeOutlineHook.makeHook).toBe('function');
    });

    it('should have correct custom arguments', () => {
      const { customArgs } = codeOutlineHook;

      expect(customArgs).toBeDefined();
      expect(customArgs?.format).toBeDefined();
      expect(customArgs?.format.type).toBe('string');
      expect(customArgs?.format.default).toBe('ascii');

      expect(customArgs?.depth).toBeDefined();
      expect(customArgs?.depth.type).toBe('number');

      expect(customArgs?.includeAll).toBeDefined();
      expect(customArgs?.includeAll.type).toBe('boolean');
      expect(customArgs?.includeAll.default).toBe(false);

      expect(customArgs?.customPatterns).toBeDefined();
      expect(customArgs?.customPatterns.type).toBe('string');
    });
  });

  describe('makeHook', () => {
    const validContext = () => ({ settingsDirectoryPath: settingsDir });

    it('should throw error if settingsDirectoryPath is not provided', () => {
      expect(() => {
        codeOutlineHook.makeHook({}, { settingsDirectoryPath: '' });
      }).toThrow('settingsDirectoryPath is required');
    });

    it('should throw error if settings directory does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent');

      expect(() => {
        codeOutlineHook.makeHook({}, { settingsDirectoryPath: nonExistentPath });
      }).toThrow('Settings directory does not exist');
    });

    it('should create scripts directory if it does not exist', () => {
      const scriptsDir = path.join(settingsDir, 'scripts');
      expect(fs.existsSync(scriptsDir)).toBe(false);

      codeOutlineHook.makeHook({}, validContext());

      expect(fs.existsSync(scriptsDir)).toBe(true);
    });

    it('should generate hook configuration with default arguments', () => {
      const result = codeOutlineHook.makeHook({}, validContext());

      expect(result).toBeDefined();
      expect(result.SessionStart).toBeDefined();
      expect(result.SessionStart).toHaveLength(1);

      const hookConfig = result.SessionStart![0];
      expect(hookConfig.hooks).toHaveLength(1);

      const command = hookConfig.hooks[0];
      expect(command.type).toBe('command');
      expect(command.command).toContain('$CLAUDE_PROJECT_DIR/.claude/scripts/code-outline-hook.js');
      expect(command.timeout).toBe(45000);
    });

    it('should write script file with correct permissions', () => {
      codeOutlineHook.makeHook({}, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const stats = fs.statSync(scriptPath);
      expect(stats.mode & parseInt('755', 8)).toBe(parseInt('755', 8));
    });

    it('should generate script with ASCII format by default', () => {
      codeOutlineHook.makeHook({}, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain("new Formatter('ascii')");
      expect(scriptContent).toContain('const { FileProcessor }');
      expect(scriptContent).toContain('const { Formatter }');
    });

    it('should handle custom format argument', () => {
      codeOutlineHook.makeHook({ format: 'json' }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain("new Formatter('json')");
    });

    it('should handle depth argument', () => {
      codeOutlineHook.makeHook({ depth: 5 }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain('5,');
      expect(scriptContent).toContain('processor.processFiles');
    });

    it('should handle includeAll argument', () => {
      codeOutlineHook.makeHook({ includeAll: true }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      // includeAll=true means namedOnly=false in processFiles
      expect(scriptContent).toContain('false // includeAll=false means namedOnly=true');
    });

    it('should handle custom patterns', () => {
      const customPatterns = '**/*.ts,**/*.js,!node_modules/**';
      codeOutlineHook.makeHook({ customPatterns }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain('**/*.ts');
      expect(scriptContent).toContain('**/*.js');
      expect(scriptContent).toContain('!node_modules/**');
    });

    it('should validate format argument', () => {
      // Invalid format should default to ascii
      codeOutlineHook.makeHook({ format: 'invalid' }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain("new Formatter('ascii')");
    });

    it('should validate depth argument', () => {
      // Invalid depth should be ignored, using default 10
      codeOutlineHook.makeHook({ depth: 'invalid' }, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain('10,'); // Default depth

      // Negative depth should be ignored
      codeOutlineHook.makeHook({ depth: -1 }, validContext());

      const scriptContent2 = fs.readFileSync(scriptPath, 'utf8');
      expect(scriptContent2).toContain('10,'); // Default depth
    });

    it('should handle all arguments combined', () => {
      const args = {
        format: 'yaml',
        depth: 3,
        includeAll: true,
        customPatterns: '**/*.tsx,**/*.ts',
      };

      codeOutlineHook.makeHook(args, validContext());

      const scriptPath = path.join(settingsDir, 'scripts', 'code-outline-hook.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');

      expect(scriptContent).toContain("new Formatter('yaml')");
      expect(scriptContent).toContain('3,'); // depth
      expect(scriptContent).toContain('false // includeAll=false means namedOnly=true');
      expect(scriptContent).toContain('**/*.tsx');
      expect(scriptContent).toContain('**/*.ts');
    });

    it('should throw error if script writing fails', () => {
      // Make scripts directory read-only to force a write error
      const scriptsDir = path.join(settingsDir, 'scripts');
      fs.mkdirSync(scriptsDir);
      fs.chmodSync(scriptsDir, 0o444); // Read-only

      expect(() => {
        codeOutlineHook.makeHook({}, validContext());
      }).toThrow('Failed to write script file');

      // Clean up
      fs.chmodSync(scriptsDir, 0o755);
    });
  });
});

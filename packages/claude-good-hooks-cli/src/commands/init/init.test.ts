import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InitCommand } from './init.js';
import * as settings from '../../utils/settings.js';
import * as projectDetector from '../../utils/project-detector.js';
import * as fs from 'fs';
import { createInterface } from 'readline/promises';

// Mock dependencies
vi.mock('../../utils/settings.js');
vi.mock('../../utils/project-detector.js');
vi.mock('fs');
vi.mock('readline/promises');

const mockWriteSettings = vi.mocked(settings.writeSettings);
const mockGetSettingsPath = vi.mocked(settings.getSettingsPath);
const mockDetectProject = vi.mocked(projectDetector.detectProject);
const mockExistsSync = vi.mocked(fs.existsSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);
const mockCreateInterface = vi.mocked(createInterface);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('initCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsPath.mockReturnValue('/test/.claude/settings.json');
    mockExistsSync.mockReturnValue(false);
    mockDetectProject.mockReturnValue({
      type: 'node',
      features: ['nodejs', 'typescript'],
      hasTypescript: true,
      hasEslint: true,
      hasPrettier: true,
      hasJest: false,
      hasVitest: true,
      packageManager: 'npm'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful initialization', () => {
    it('should initialize with --yes flag (non-interactive)', async () => {
      const command = new InitCommand();
      await command.execute([], { yes: true });

      expect(mockMkdirSync).toHaveBeenCalledWith('/test/.claude', { recursive: true });
      expect(mockWriteSettings).toHaveBeenCalledWith('project', expect.objectContaining({
        hooks: expect.any(Object)
      }));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-configured hooks'));
    });

    it('should initialize with global scope', async () => {
      mockGetSettingsPath.mockReturnValue('/home/user/.claude/settings.json');
      
      const command = new InitCommand();
      await command.execute([], { scope: 'global', yes: true });

      expect(mockGetSettingsPath).toHaveBeenCalledWith('global');
      expect(mockWriteSettings).toHaveBeenCalledWith('global', expect.any(Object));
    });

    it('should detect React project and generate appropriate hooks', async () => {
      mockDetectProject.mockReturnValue({
        type: 'react',
        features: ['react', 'vite', 'typescript'],
        hasTypescript: true,
        hasEslint: true,
        hasPrettier: true,
        hasJest: false,
        hasVitest: true,
        packageManager: 'pnpm'
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall?.[1];
      expect(settings?.hooks).toBeDefined();
      expect(settings?.hooks?.PostToolUse).toBeDefined();
      expect(settings?.hooks?.PostToolUse?.length).toBeGreaterThan(0);
    });

    it('should create directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const command = new InitCommand();
      await command.execute([], { yes: true });

      expect(mockMkdirSync).toHaveBeenCalledWith('/test/.claude', { recursive: true });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created directory'));
    });

    it('should not create directory if it already exists', async () => {
      mockExistsSync.mockReturnValue(true);

      const command = new InitCommand();
      await command.execute([], { yes: true });

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should fail if settings file already exists without --force', async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === '/test/.claude/settings.json') return true;
        return false;
      });

      const command = new InitCommand();
      await command.execute([], {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Settings file already exists'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should overwrite existing settings with --force flag', async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === '/test/.claude/settings.json') return true;
        return false;
      });

      const command = new InitCommand();
      await command.execute([], { force: true, yes: true });

      expect(mockWriteSettings).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });
  });

  describe('interactive mode', () => {
    it('should handle interactive mode with auto-configuration', async () => {
      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('y') // use auto config
          .mockResolvedValueOnce('n') // no additional templates
          .mockResolvedValueOnce('y'), // confirm
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      const command = new InitCommand();
      await command.execute([], {});

      expect(mockReadline.question).toHaveBeenCalledTimes(3);
      expect(mockWriteSettings).toHaveBeenCalled();
    });

    it('should handle interactive mode with template selection', async () => {
      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('y') // use auto config
          .mockResolvedValueOnce('y') // add templates
          .mockResolvedValueOnce('1,2') // select templates
          .mockResolvedValueOnce('y'), // confirm
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      const command = new InitCommand();
      await command.execute([], {});

      expect(mockReadline.question).toHaveBeenCalledTimes(4);
      expect(mockWriteSettings).toHaveBeenCalled();
    });

    it('should handle cancellation during interactive mode', async () => {
      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('y') // use auto config
          .mockResolvedValueOnce('n') // no additional templates
          .mockResolvedValueOnce('n'), // do not confirm
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      const command = new InitCommand();
      await command.execute([], {});

      expect(mockReadline.question).toHaveBeenCalledTimes(3);
      expect(mockWriteSettings).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('project type detection', () => {
    it('should detect Python project', async () => {
      mockDetectProject.mockReturnValue({
        type: 'python',
        features: ['python'],
        hasTypescript: false,
        hasEslint: false,
        hasPrettier: false,
        hasJest: false,
        hasVitest: false
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      expect(settings.hooks.PostToolUse).toBeDefined();
      
      // Check for Python-specific hooks
      const pythonHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('python3 -m py_compile'))
      );
      expect(pythonHook).toBeDefined();
    });

    it('should detect Go project', async () => {
      mockDetectProject.mockReturnValue({
        type: 'go',
        features: ['go'],
        hasTypescript: false,
        hasEslint: false,
        hasPrettier: false,
        hasJest: false,
        hasVitest: false
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      expect(settings.hooks.PostToolUse).toBeDefined();
      
      // Check for Go-specific hooks
      const goHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('go build'))
      );
      expect(goHook).toBeDefined();
    });

    it('should detect Rust project', async () => {
      mockDetectProject.mockReturnValue({
        type: 'rust',
        features: ['rust'],
        hasTypescript: false,
        hasEslint: false,
        hasPrettier: false,
        hasJest: false,
        hasVitest: false
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      expect(settings.hooks.PostToolUse).toBeDefined();
      
      // Check for Rust-specific hooks
      const rustHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('rustc'))
      );
      expect(rustHook).toBeDefined();
    });
  });

  describe('feature-based hooks', () => {
    it('should add ESLint hooks when ESLint is detected', async () => {
      mockDetectProject.mockReturnValue({
        type: 'node',
        features: ['nodejs', 'eslint'],
        hasTypescript: false,
        hasEslint: true,
        hasPrettier: false,
        hasJest: false,
        hasVitest: false,
        packageManager: 'npm'
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      
      // Check for ESLint hooks
      const eslintHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('npx eslint'))
      );
      expect(eslintHook).toBeDefined();
    });

    it('should add Prettier hooks when Prettier is detected', async () => {
      mockDetectProject.mockReturnValue({
        type: 'node',
        features: ['nodejs', 'prettier'],
        hasTypescript: false,
        hasEslint: false,
        hasPrettier: true,
        hasJest: false,
        hasVitest: false,
        packageManager: 'npm'
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      
      // Check for Prettier hooks
      const prettierHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('npx prettier --write'))
      );
      expect(prettierHook).toBeDefined();
    });

    it('should add testing hooks when test frameworks are detected', async () => {
      mockDetectProject.mockReturnValue({
        type: 'node',
        features: ['nodejs', 'vitest'],
        hasTypescript: false,
        hasEslint: false,
        hasPrettier: false,
        hasJest: false,
        hasVitest: true,
        packageManager: 'npm'
      });

      const command = new InitCommand();
      await command.execute([], { yes: true });

      const settingsCall = mockWriteSettings.mock.calls[0];
      const settings = settingsCall[1];
      
      // Check for testing hooks
      const testHook = settings.hooks.PostToolUse.find((config: any) => 
        config.hooks.some((hook: any) => hook.command.includes('test'))
      );
      expect(testHook).toBeDefined();
    });
  });
});
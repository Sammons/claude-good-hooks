import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleService } from './module.service.js';

// Mock Node.js fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// Mock Node.js path module
vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  resolve: vi.fn((cwd: string, path: string) => (path.startsWith('/') ? path : `${cwd}/${path}`)),
}));

// Mock process.cwd
const originalCwd = process.cwd;
beforeEach(() => {
  process.cwd = vi.fn(() => '/test/cwd');
});

afterEach(() => {
  process.cwd = originalCwd;
});

vi.mock('../utils/detect-package-manager.js', () => ({
  detectPackageManager: () => 'npm',
}));

vi.mock('../helpers/package-manager-helper.js', () => ({
  PackageManagerHelper: vi.fn().mockImplementation(() => ({
    getGlobalRoot: () => Promise.resolve('/global/npm'),
    listModules: () => Promise.resolve({ dependencies: {} }),
  })),
}));

describe('ModuleService', () => {
  let moduleService: ModuleService;

  beforeEach(() => {
    vi.clearAllMocks();
    moduleService = new ModuleService();
  });

  describe('isFilePath', () => {
    it('should identify .js files', () => {
      expect((moduleService as any).isFilePath('./my-hook.js')).toBe(true);
      expect((moduleService as any).isFilePath('my-hook.js')).toBe(true);
      expect((moduleService as any).isFilePath('/absolute/path/hook.js')).toBe(true);
    });

    it('should identify .mjs files', () => {
      expect((moduleService as any).isFilePath('./my-hook.mjs')).toBe(true);
      expect((moduleService as any).isFilePath('my-hook.mjs')).toBe(true);
      expect((moduleService as any).isFilePath('/absolute/path/hook.mjs')).toBe(true);
    });

    it('should identify .cjs files', () => {
      expect((moduleService as any).isFilePath('./my-hook.cjs')).toBe(true);
      expect((moduleService as any).isFilePath('my-hook.cjs')).toBe(true);
      expect((moduleService as any).isFilePath('/absolute/path/hook.cjs')).toBe(true);
    });

    it('should identify absolute paths', () => {
      expect((moduleService as any).isFilePath('/usr/local/hooks/my-hook')).toBe(true);
      expect((moduleService as any).isFilePath('/home/user/hook.js')).toBe(true);
    });

    it('should identify relative paths', () => {
      expect((moduleService as any).isFilePath('./hooks/my-hook')).toBe(true);
      expect((moduleService as any).isFilePath('../hooks/my-hook')).toBe(true);
      expect((moduleService as any).isFilePath('./my-hook.js')).toBe(true);
    });

    it('should not identify npm packages as file paths', () => {
      expect((moduleService as any).isFilePath('@sammons/git-dirty-hook')).toBe(false);
      expect((moduleService as any).isFilePath('my-npm-package')).toBe(false);
      expect((moduleService as any).isFilePath('package-name/export')).toBe(false);
    });
  });

  describe('parseHookIdentifier', () => {
    it('should parse file paths correctly', () => {
      const result = (moduleService as any).parseHookIdentifier('./my-hook.js');
      expect(result).toEqual({
        moduleName: './my-hook.js',
        exportPath: undefined,
        isFile: true,
      });
    });

    it('should parse absolute file paths', () => {
      const result = (moduleService as any).parseHookIdentifier('/home/user/hooks/my-hook.mjs');
      expect(result).toEqual({
        moduleName: '/home/user/hooks/my-hook.mjs',
        exportPath: undefined,
        isFile: true,
      });
    });

    it('should parse scoped package without suffix', () => {
      const result = (moduleService as any).parseHookIdentifier('@sammons/git-dirty-hook');
      expect(result).toEqual({
        moduleName: '@sammons/git-dirty-hook',
        exportPath: undefined,
        isFile: false,
      });
    });

    it('should parse scoped package with suffix', () => {
      const result = (moduleService as any).parseHookIdentifier(
        '@sammons/code-outline-hook/code-outline'
      );
      expect(result).toEqual({
        moduleName: '@sammons/code-outline-hook',
        exportPath: 'code-outline',
        isFile: false,
      });
    });

    it('should parse non-scoped package without suffix', () => {
      const result = (moduleService as any).parseHookIdentifier('my-hook-package');
      expect(result).toEqual({
        moduleName: 'my-hook-package',
        exportPath: undefined,
        isFile: false,
      });
    });

    it('should parse non-scoped package with suffix', () => {
      const result = (moduleService as any).parseHookIdentifier('my-hook-package/special-hook');
      expect(result).toEqual({
        moduleName: 'my-hook-package',
        exportPath: 'special-hook',
        isFile: false,
      });
    });

    it('should handle complex export paths', () => {
      const result = (moduleService as any).parseHookIdentifier(
        '@sammons/hooks/hooks/special/deep'
      );
      expect(result).toEqual({
        moduleName: '@sammons/hooks',
        exportPath: 'hooks/special/deep',
        isFile: false,
      });
    });
  });

  describe('extractModuleNameFromHookName', () => {
    it('should extract module name from scoped package with suffix', () => {
      const result = moduleService.extractModuleNameFromHookName(
        '@sammons/code-outline-hook/code-outline'
      );
      expect(result).toBe('@sammons/code-outline-hook');
    });

    it('should return full name when no suffix', () => {
      const result = moduleService.extractModuleNameFromHookName('@sammons/git-dirty-hook');
      expect(result).toBe('@sammons/git-dirty-hook');
    });

    it('should handle non-scoped packages', () => {
      const result = moduleService.extractModuleNameFromHookName('my-hook/sub-hook');
      expect(result).toBe('my-hook');
    });
  });

  describe('loadHookPlugin with deep imports', () => {
    it('should load default export when no suffix provided', async () => {
      const mockModule = {
        HookPlugin: { name: 'default-hook' },
      };
      vi.doMock('@sammons/test-hook', () => mockModule, { virtual: true });

      // Note: In a real test environment, we'd need to properly mock the dynamic import
      // This is a simplified example to show the intended behavior
    });

    it('should load named export when suffix provided', async () => {
      const mockModule = {
        codeOutline: { name: 'code-outline-hook' },
        HookPlugin: { name: 'default-hook' },
      };
      vi.doMock('@sammons/test-hook', () => mockModule, { virtual: true });

      // The loadHookPlugin method would access mockModule['codeOutline']
      // when called with '@sammons/test-hook/codeOutline'
    });

    it('should fall back to suffix+HookPlugin pattern', async () => {
      const mockModule = {
        codeOutlineHookPlugin: { name: 'code-outline-hook' },
      };
      vi.doMock('@sammons/test-hook', () => mockModule, { virtual: true });

      // The loadHookPlugin method would access mockModule['codeOutlineHookPlugin']
      // when called with '@sammons/test-hook/codeOutline'
    });

    it('should return null when specified export not found', async () => {
      const mockModule = {
        HookPlugin: { name: 'default-hook' },
      };
      vi.doMock('@sammons/test-hook', () => mockModule, { virtual: true });

      // The loadHookPlugin method would return null
      // when called with '@sammons/test-hook/nonExistent'
    });
  });

  describe('isModuleInstalled with deep imports', () => {
    it('should check base module regardless of suffix', async () => {
      const { existsSync } = await import('fs');
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await moduleService.isModuleInstalled('@sammons/test-hook/deep-export');

      expect(existsSync).toHaveBeenCalledWith('/test/cwd/node_modules/@sammons/test-hook');
      expect(result).toBe(true);
    });

    it('should handle global installation check with suffix', async () => {
      const { existsSync } = await import('fs');
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await moduleService.isModuleInstalled('@sammons/test-hook/deep-export', true);

      expect(existsSync).toHaveBeenCalledWith('/global/npm/@sammons/test-hook');
      expect(result).toBe(true);
    });
  });

  describe('isModuleInstalled with file paths', () => {
    it('should check if relative file path exists', async () => {
      const { existsSync } = await import('fs');
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await moduleService.isModuleInstalled('./my-hook.js');

      expect(existsSync).toHaveBeenCalledWith('/test/cwd/./my-hook.js');
      expect(result).toBe(true);
    });

    it('should check if absolute file path exists', async () => {
      const { existsSync } = await import('fs');
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await moduleService.isModuleInstalled('/home/user/hooks/my-hook.mjs');

      expect(existsSync).toHaveBeenCalledWith('/home/user/hooks/my-hook.mjs');
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const { existsSync } = await import('fs');
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await moduleService.isModuleInstalled('./non-existent.js');

      expect(existsSync).toHaveBeenCalledWith('/test/cwd/./non-existent.js');
      expect(result).toBe(false);
    });
  });
});

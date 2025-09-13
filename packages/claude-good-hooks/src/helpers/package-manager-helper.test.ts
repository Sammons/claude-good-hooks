import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageManagerHelper } from './package-manager-helper.js';

// Mock Node.js child_process module
vi.mock('child_process', () => ({
  exec: vi.fn(),
  execSync: vi.fn(),
}));

import { exec } from 'child_process';
import { promisify } from 'util';

const mockExec = vi.mocked(exec);
const execAsync = promisify(mockExec);

describe('PackageManagerHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('npm commands', () => {
    const helper = new PackageManagerHelper('npm');

    it('should generate correct global root command', () => {
      expect(helper.globalRootCommand()).toBe('npm root -g');
    });

    it('should generate correct list modules command', () => {
      expect(helper.listModulesCommand()).toBe('npm ls --json --depth=0');
      expect(helper.listModulesCommand({ global: true })).toBe('npm ls -g --json --depth=0');
      expect(helper.listModulesCommand({ depth: 1 })).toBe('npm ls --json --depth=1');
    });

    it('should generate correct install commands', () => {
      expect(helper.installCommand('express')).toBe('npm install express');
      expect(helper.installCommand('express', { global: true })).toBe('npm install -g express');
      expect(helper.installCommand('express', { saveDev: true })).toBe(
        'npm install --save-dev express'
      );
      expect(helper.installCommand()).toBe('npm install');
    });

    it('should generate correct uninstall commands', () => {
      expect(helper.uninstallCommand('express')).toBe('npm uninstall express');
      expect(helper.uninstallCommand('express', { global: true })).toBe('npm uninstall -g express');
    });

    it('should generate correct version command', () => {
      expect(helper.versionCommand()).toBe('npm --version');
    });

    it('should generate correct update commands', () => {
      expect(helper.updateCommand('express')).toBe('npm update express');
      expect(helper.updateCommand('express', { global: true })).toBe('npm update -g express');
    });
  });

  describe('pnpm commands', () => {
    const helper = new PackageManagerHelper('pnpm');

    it('should generate correct global root command', () => {
      expect(helper.globalRootCommand()).toBe('pnpm root -g');
    });

    it('should generate correct list modules command', () => {
      expect(helper.listModulesCommand()).toBe('pnpm ls --json --depth=0');
      expect(helper.listModulesCommand({ global: true })).toBe('pnpm ls -g --json --depth=0');
    });

    it('should generate correct install commands', () => {
      expect(helper.installCommand('express')).toBe('pnpm add express');
      expect(helper.installCommand('express', { global: true })).toBe('pnpm add -g express');
      expect(helper.installCommand('express', { saveDev: true })).toBe('pnpm add -D express');
    });

    it('should generate correct uninstall commands', () => {
      expect(helper.uninstallCommand('express')).toBe('pnpm remove express');
      expect(helper.uninstallCommand('express', { global: true })).toBe('pnpm remove -g express');
    });

    it('should generate correct version command', () => {
      expect(helper.versionCommand()).toBe('pnpm --version');
    });
  });

  describe('yarn commands', () => {
    const helper = new PackageManagerHelper('yarn');

    it('should generate correct global root command', () => {
      expect(helper.globalRootCommand()).toBe('yarn global dir');
    });

    it('should generate correct install commands', () => {
      expect(helper.installCommand('express')).toBe('yarn add express');
      expect(helper.installCommand('express', { global: true })).toBe('yarn global add express');
      expect(helper.installCommand('express', { saveDev: true })).toBe('yarn add --dev express');
    });

    it('should generate correct uninstall commands', () => {
      expect(helper.uninstallCommand('express')).toBe('yarn remove express');
      expect(helper.uninstallCommand('express', { global: true })).toBe(
        'yarn global remove express'
      );
    });

    it('should generate correct version command', () => {
      expect(helper.versionCommand()).toBe('yarn --version');
    });
  });

  describe('exec commands', () => {
    it('should generate correct exec commands for npm', () => {
      const helper = new PackageManagerHelper('npm');
      expect(helper.execCommand('typescript')).toBe('npx typescript');
      expect(helper.execCommand('typescript', { args: ['--version'] })).toBe(
        'npx typescript --version'
      );
    });

    it('should generate correct exec commands for pnpm', () => {
      const helper = new PackageManagerHelper('pnpm');
      expect(helper.execCommand('typescript')).toBe('pnpm exec typescript');
      expect(helper.execCommand('typescript', { args: ['--version'] })).toBe(
        'pnpm exec typescript --version'
      );
    });

    it('should generate correct exec commands for yarn', () => {
      const helper = new PackageManagerHelper('yarn');
      expect(helper.execCommand('typescript')).toBe('yarn exec typescript');
      expect(helper.execCommand('typescript', { args: ['--version'] })).toBe(
        'yarn exec typescript --version'
      );
    });
  });

  describe('run script commands', () => {
    it('should generate correct run script commands', () => {
      const npmHelper = new PackageManagerHelper('npm');
      const pnpmHelper = new PackageManagerHelper('pnpm');
      const yarnHelper = new PackageManagerHelper('yarn');

      expect(npmHelper.runScriptCommand('build')).toBe('npm run build');
      expect(pnpmHelper.runScriptCommand('build')).toBe('pnpm run build');
      expect(yarnHelper.runScriptCommand('build')).toBe('yarn run build');
    });
  });

  describe('install instructions', () => {
    it('should provide readable install instructions', () => {
      const helper = new PackageManagerHelper('pnpm');
      expect(helper.getInstallInstructions('express', true)).toBe('pnpm add -g express');
      expect(helper.getInstallInstructions('express', false)).toBe('pnpm add express');
    });
  });

  describe.skip('async execution methods', () => {
    it('should execute getGlobalRoot successfully', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: '/usr/local/lib/node_modules\n', stderr: '' } as any);
        }
        return {} as any;
      });

      const helper = new PackageManagerHelper('npm');
      const result = await helper.getGlobalRoot();

      expect(result).toBe('/usr/local/lib/node_modules');
      expect(mockExec).toHaveBeenCalledWith('npm root -g', expect.any(Function));
    });

    it('should handle getGlobalRoot failure', async () => {
      mockProcessService.exec.mockRejectedValue(new Error('Command failed'));
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      await expect(helper.getGlobalRoot()).rejects.toThrow('Failed to get global root directory');
    });

    it('should execute listModules successfully', async () => {
      const mockData = {
        dependencies: {
          express: { version: '4.18.0' },
          lodash: { version: '4.17.21' },
        },
      };
      mockProcessService.exec.mockResolvedValue({
        stdout: JSON.stringify(mockData),
        stderr: '',
      });
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.listModules({ depth: 0, global: false });

      expect(result).toEqual(mockData);
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm ls --json --depth=0');
    });

    it('should handle listModules failure', async () => {
      mockProcessService.exec.mockRejectedValue(new Error('Command failed'));
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      await expect(helper.listModules()).rejects.toThrow('Failed to list modules');
    });

    it('should execute install successfully', async () => {
      mockProcessService.exec.mockResolvedValue(mockSuccessfulExec);
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.install('express');

      expect(result.success).toBe(true);
      expect(result.output).toBe('mock output');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm install express');
    });

    it('should handle install failure', async () => {
      mockProcessService.exec.mockRejectedValue(new Error('Install failed'));
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.install('express');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Install failed');
    });

    it('should execute getVersion successfully', async () => {
      mockProcessService.exec.mockResolvedValue({ stdout: '9.5.0\n', stderr: '' });
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.getVersion();

      expect(result).toBe('9.5.0');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm --version');
    });

    it('should handle getVersion failure', async () => {
      mockProcessService.exec.mockRejectedValue(new Error('Command failed'));
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      await expect(helper.getVersion()).rejects.toThrow('Failed to get package manager version');
    });

    it('should execute update successfully', async () => {
      mockProcessService.exec.mockResolvedValue(mockSuccessfulExec);
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.update('express');

      expect(result.success).toBe(true);
      expect(result.output).toBe('mock output');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm update express');
    });

    it('should execute uninstall successfully', async () => {
      mockProcessService.exec.mockResolvedValue(mockSuccessfulExec);
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.uninstall('express');

      expect(result.success).toBe(true);
      expect(result.output).toBe('mock output');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm uninstall express');
    });

    it('should execute runScript successfully', async () => {
      mockProcessService.exec.mockResolvedValue(mockSuccessfulExec);
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.runScript('build');

      expect(result.success).toBe(true);
      expect(result.output).toBe('mock output');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npm run build');
    });

    it('should execute exec successfully', async () => {
      mockProcessService.exec.mockResolvedValue(mockSuccessfulExec);
      const helper = new PackageManagerHelper('npm', mockProcessService as any);

      const result = await helper.exec('typescript', { args: ['--version'] });

      expect(result.success).toBe(true);
      expect(result.output).toBe('mock output');
      expect(mockProcessService.exec).toHaveBeenCalledWith('npx typescript --version');
    });
  });
});

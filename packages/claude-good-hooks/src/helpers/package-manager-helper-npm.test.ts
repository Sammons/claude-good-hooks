import { describe, it, expect, beforeEach } from 'vitest';
import { PackageManagerHelper } from './package-manager-helper.js';
import { createMockProcessService, type MockProcessService } from './package-manager-helper-shared-setup.js';

describe('PackageManagerHelper NPM Commands', () => {
  let mockProcessService: MockProcessService;

  beforeEach(() => {
    mockProcessService = createMockProcessService();
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
});
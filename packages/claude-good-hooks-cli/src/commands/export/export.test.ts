import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { exportCommand } from './export.js';
import * as settings from '../../utils/settings.js';
import * as fs from 'fs';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/settings.js');
vi.mock('fs');

const mockReadSettings = vi.mocked(settings.readSettings);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockExistsSync = vi.mocked(fs.existsSync);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('exportCommand', () => {
  const mockSettings: ClaudeSettings = {
    hooks: {
      PreToolUse: [{
        matcher: 'Write|Edit',
        hooks: [{
          type: 'command',
          command: 'echo "pre-tool validation"',
          timeout: 30
        }]
      }],
      PostToolUse: [{
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'git status --porcelain',
          timeout: 10
        }]
      }]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    
    // Mock Date for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('successful export', () => {
    it('should export project settings to JSON by default', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project' });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'claude-hooks-project-2024-01-01.json',
        expect.stringContaining('"version": "1.0.0"'),
        'utf8'
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration exported successfully'));
    });

    it('should export all scopes when scope is "all"', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        if (scope === 'global') return { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo "stop"' }] }] } };
        return {};
      });

      await exportCommand({ scope: 'all' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const exportedContent = JSON.parse(writeCall[1] as string);
      
      expect(exportedContent.settings).toHaveProperty('project');
      expect(exportedContent.settings).toHaveProperty('global');
      expect(exportedContent.metadata.source).toEqual(['project', 'global']);
    });

    it('should export to custom output file', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', output: 'my-hooks.json' });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'my-hooks.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should export in YAML format', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', format: 'yaml' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(writeCall[0]).toBe('claude-hooks-project-2024-01-01.yaml');
      expect(content).toContain('version: "1.0.0"');
      expect(content).toContain('settings:');
    });

    it('should export in template format', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', format: 'template' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(writeCall[0]).toBe('claude-hooks-project-2024-01-01.template');
      expect(content).toContain('# Claude Good Hooks Configuration Template');
      expect(content).toContain('# Usage:');
      expect(content).toContain('PreToolUse');
    });

    it('should minify JSON output when requested', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', minify: true });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      // Minified JSON should not contain newlines or extra spaces
      expect(content).not.toContain('\n  ');
    });

    it('should handle export without metadata', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', includeMetadata: false });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const exportedContent = JSON.parse(writeCall[1] as string);
      
      expect(exportedContent.metadata).toBeDefined(); // Metadata is always included
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Use --include-metadata'));
    });

    it('should show export statistics', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Statistics:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total hooks: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total events: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File size:'));
    });

    it('should show usage instructions', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage Instructions:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Share this file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('claude-good-hooks import'));
    });

    it('should handle file overwrite warning', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', output: 'existing-file.json' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File already exists'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Overwriting existing file'));
    });
  });

  describe('error handling', () => {
    it('should fail when no hooks found to export', async () => {
      mockReadSettings.mockReturnValue({});

      await exportCommand({ scope: 'project' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found to export'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle unsupported format', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'project', format: 'xml' as any });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Export failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle write errors', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {};
      });
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      await exportCommand({ scope: 'project' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Export failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('scope handling', () => {
    it('should handle global scope', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'global') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'global' });

      expect(mockReadSettings).toHaveBeenCalledWith('global');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found hooks in global settings'));
    });

    it('should handle local scope', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'local') return mockSettings;
        return {};
      });

      await exportCommand({ scope: 'local' });

      expect(mockReadSettings).toHaveBeenCalledWith('local');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found hooks in local settings'));
    });

    it('should handle mixed scopes with some empty', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return mockSettings;
        return {}; // global and local are empty
      });

      await exportCommand({ scope: 'all' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const exportedContent = JSON.parse(writeCall[1] as string);
      
      expect(exportedContent.settings).toHaveProperty('project');
      expect(exportedContent.settings).not.toHaveProperty('global');
      expect(exportedContent.settings).not.toHaveProperty('local');
    });
  });

  describe('template generation', () => {
    it('should generate proper template with comments', async () => {
      const complexSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [{
            matcher: 'Bash',
            hooks: [{
              type: 'command',
              command: '#!/bin/bash\necho "Validating bash command"\nif [ "$#" -eq 0 ]; then\n  echo "No arguments provided"\n  exit 1\nfi',
              timeout: 60
            }]
          }],
          SessionStart: [{
            hooks: [{
              type: 'command',
              command: 'echo "Session started"'
            }]
          }]
        }
      };

      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return complexSettings;
        return {};
      });

      await exportCommand({ scope: 'project', format: 'template' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(content).toContain('# Before Claude uses tools');
      expect(content).toContain('# When Claude starts a session');
      expect(content).toContain('# Multi-line command');
      expect(content).toContain('"matcher": "Bash"');
      expect(content).toContain('"timeout": 60');
    });

    it('should handle template for multi-scope export', async () => {
      mockReadSettings.mockImplementation((scope) => {
        if (scope === 'project') return { hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'echo "project"' }] }] } };
        if (scope === 'global') return { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo "global"' }] }] } };
        return {};
      });

      await exportCommand({ scope: 'all', format: 'template' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(content).toContain('# PROJECT SETTINGS');
      expect(content).toContain('# GLOBAL SETTINGS');
      expect(content).toContain('# These hooks apply at the project level');
      expect(content).toContain('# These hooks apply at the global level');
    });
  });
});
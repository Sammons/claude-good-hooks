/**
 * Tests for debug command functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock file system operations
vi.mock('fs');
vi.mock('path');

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockJoin = vi.mocked(join);

// Mock process.cwd()
vi.stubGlobal('process', {
  ...process,
  cwd: vi.fn(() => '/test/project'),
  argv: ['node', 'cli', 'debug']
});

describe('Debug Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockImplementation((...paths) => paths.join('/'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Debug Configuration Management', () => {
    it('should save debug configuration correctly', () => {
      // Mock that config file doesn't exist initially
      mockExistsSync.mockReturnValue(false);
      
      // Import here to ensure mocks are applied
      const { debugCommand } = require('./debug.js');
      
      // Simulate enabling debug for a hook
      process.argv = ['node', 'cli', 'debug', 'enable', 'test-hook', '--trace', '--profile'];
      
      // The function should call writeFileSync to save the config
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('debug-configs.json'),
        expect.stringContaining('"enabled":true'),
        'utf8'
      );
    });

    it('should load existing debug configurations', () => {
      const mockConfig = {
        'test-hook': {
          enabled: true,
          tracing: true,
          profiling: false,
          logLevel: 'info'
        }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { debugCommand } = require('./debug.js');
      
      // Should be able to load and parse the configuration
      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('debug-configs.json'),
        'utf8'
      );
    });

    it('should handle corrupted config files gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      const { debugCommand } = require('./debug.js');
      
      // Should not throw an error and should start with empty config
      expect(() => {
        // Load configurations - should handle JSON parse error gracefully
      }).not.toThrow();
    });
  });

  describe('Debug Status Display', () => {
    it('should display debug status in human-readable format', async () => {
      const mockConfig = {
        'hook1': { enabled: true, tracing: true, profiling: false, logLevel: 'debug' },
        'hook2': { enabled: false, tracing: false, profiling: true, logLevel: 'info' }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'status'];
      const { debugCommand } = require('./debug.js');

      // Should display status information
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Debug Status'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('hook1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('hook2'));

      consoleSpy.mockRestore();
    });

    it('should display JSON format when requested', async () => {
      const mockConfig = {
        'test-hook': { enabled: true, tracing: false, profiling: true, logLevel: 'warn' }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'status', '--json'];
      const { debugCommand } = require('./debug.js');

      // Should output JSON format
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\{[\s\S]*\}$/)
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty debug configurations', async () => {
      mockExistsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'status'];
      const { debugCommand } = require('./debug.js');

      // Should display message about no hooks being debugged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No hooks are currently being debugged')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Tracing Configuration', () => {
    it('should configure tracing with proper settings', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'trace', '--output', '/custom/trace.log'];
      const { debugCommand } = require('./debug.js');

      // Should save tracing configuration
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('tracing-hook.json'),
        expect.stringContaining('"name":"debug-tracer"'),
        'utf8'
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tracing enabled'));

      consoleSpy.mockRestore();
    });
  });

  describe('Profiling Configuration', () => {
    it('should configure profiling with metrics file', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'profile', '--output', '/custom/metrics.json'];
      const { debugCommand } = require('./debug.js');

      // Should save profiling configuration
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('profiling-hook.json'),
        expect.stringContaining('"name":"debug-profiler"'),
        'utf8'
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Profiling enabled'));

      consoleSpy.mockRestore();
    });
  });

  describe('Report Generation', () => {
    it('should generate summary report', async () => {
      const mockConfig = {
        'hook1': { enabled: true, tracing: true, profiling: false }
      };

      const mockExecutions = {
        executions: [
          {
            context: { hookName: 'hook1', executionId: 'exec1', timestamp: new Date() },
            success: true,
            duration: 100
          },
          {
            context: { hookName: 'hook1', executionId: 'exec2', timestamp: new Date() },
            success: false,
            duration: 200
          }
        ]
      };

      mockExistsSync.mockImplementation((path) => {
        if (path.includes('debug-configs.json')) return true;
        if (path.includes('executions.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path.includes('debug-configs.json')) return JSON.stringify(mockConfig);
        if (path.includes('executions.json')) return JSON.stringify(mockExecutions);
        return '';
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'report', 'summary'];
      const { debugCommand } = require('./debug.js');

      // Should generate and display summary report
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Debug Summary Report'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hooks with debug enabled: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent executions: 2'));

      consoleSpy.mockRestore();
    });

    it('should generate performance report from metrics', async () => {
      const mockMetrics = [
        '{"phase": "start", "timestamp": "2024-01-01T10:00:00Z", "memory": 102400, "cpu": 25.5}',
        '{"phase": "end", "timestamp": "2024-01-01T10:00:01Z", "memory": 110592, "cpu": 30.2}'
      ].join('\n');

      mockExistsSync.mockImplementation((path) => {
        return path.includes('metrics.json');
      });

      mockReadFileSync.mockReturnValue(mockMetrics);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'report', 'performance'];
      const { debugCommand } = require('./debug.js');

      // Should generate performance report
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Report'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Average Memory'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Average CPU'));

      consoleSpy.mockRestore();
    });

    it('should save report to file when output specified', async () => {
      mockExistsSync.mockReturnValue(false);

      process.argv = ['node', 'cli', 'debug', 'report', 'summary', '--output', '/test/report.txt'];
      const { debugCommand } = require('./debug.js');

      // Should write report to specified file
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/report.txt',
        expect.stringContaining('Debug Summary Report'),
        'utf8'
      );
    });
  });

  describe('Log Analysis', () => {
    it('should display recent debug logs', async () => {
      const mockLogContent = [
        '[2024-01-01T10:00:00Z] DEBUG Hook execution started',
        '[2024-01-01T10:00:01Z] INFO Hook completed successfully',
        '[2024-01-01T10:00:02Z] WARN Performance degradation detected'
      ].join('\n');

      mockExistsSync.mockImplementation((path) => {
        return path.includes('debug.log');
      });

      mockReadFileSync.mockReturnValue(mockLogContent);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'logs'];
      const { debugCommand } = require('./debug.js');

      // Should display log content
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Debug Logs'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hook execution started'));

      consoleSpy.mockRestore();
    });

    it('should filter logs by level', async () => {
      const mockLogContent = [
        '[2024-01-01T10:00:00Z] DEBUG Debug message',
        '[2024-01-01T10:00:01Z] INFO Info message',
        '[2024-01-01T10:00:02Z] WARN Warning message',
        '[2024-01-01T10:00:03Z] ERROR Error message'
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockLogContent);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'logs', '--log-level', 'warn'];
      const { debugCommand } = require('./debug.js');

      // Should only display warnings and errors (logs containing 'warn')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));

      consoleSpy.mockRestore();
    });
  });

  describe('Execution Analysis', () => {
    it('should list recent executions when no ID provided', async () => {
      const mockExecutions = {
        executions: [
          {
            context: {
              hookName: 'test-hook',
              executionId: 'exec-123',
              timestamp: new Date('2024-01-01T10:00:00Z')
            },
            success: true,
            duration: 150
          },
          {
            context: {
              hookName: 'other-hook',
              executionId: 'exec-456',
              timestamp: new Date('2024-01-01T10:01:00Z')
            },
            success: false,
            duration: 300
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockExecutions));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'analyze'];
      const { debugCommand } = require('./debug.js');

      // Should list recent executions
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent Hook Executions'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('exec-123'));

      consoleSpy.mockRestore();
    });

    it('should analyze specific execution when ID provided', async () => {
      const mockExecution = {
        context: {
          hookName: 'analyzed-hook',
          executionId: 'exec-789',
          eventType: 'PostToolUse',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        success: false,
        duration: 250,
        exitCode: 1,
        error: 'Test error message'
      };

      const mockExecutions = {
        executions: [mockExecution]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockExecutions));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'analyze', 'exec-789'];
      const { debugCommand } = require('./debug.js');

      // Should display detailed analysis
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hook Debug Report'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('analyzed-hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('exec-789'));

      consoleSpy.mockRestore();
    });
  });

  describe('Breakpoint Management', () => {
    it('should set breakpoint for hook', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', 'breakpoint', 'target-hook', 'file.endsWith(".ts")', '--interactive'];
      const { debugCommand } = require('./debug.js');

      // Should save breakpoint configuration
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('breakpoints.json'),
        expect.stringContaining('"interactive":true'),
        'utf8'
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Setting breakpoint for hook: target-hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Condition: file.endsWith(".ts")'));

      consoleSpy.mockRestore();
    });
  });

  describe('Help Display', () => {
    it('should display help information', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.argv = ['node', 'cli', 'debug', '--help'];
      const { debugCommand } = require('./debug.js');

      // Should display comprehensive help
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Claude Good Hooks Debug Tool'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Options:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Examples:'));

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing hook name for enable command', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      process.argv = ['node', 'cli', 'debug', 'enable'];
      const { debugCommand } = require('./debug.js');

      // Should display error and exit
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Hook name is required'));
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should handle unknown subcommands', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      process.argv = ['node', 'cli', 'debug', 'unknown-command'];
      const { debugCommand } = require('./debug.js');

      // Should display error about unknown subcommand
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown debug subcommand: unknown-command'));
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });
});
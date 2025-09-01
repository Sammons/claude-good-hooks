#!/usr/bin/env node

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface PerformanceConfig {
  enabled?: boolean;
  trackBuildTime?: boolean;
  trackBundleSize?: boolean;
  trackMemoryUsage?: boolean;
  thresholds?: {
    buildTimeMs?: number;
    bundleSizeMB?: number;
    memoryUsageMB?: number;
  };
  outputFile?: string;
  alertOnThresholdExceeded?: boolean;
}

const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enabled: true,
  trackBuildTime: true,
  trackBundleSize: true,
  trackMemoryUsage: true,
  thresholds: {
    buildTimeMs: 30000, // 30 seconds
    bundleSizeMB: 5,    // 5 MB
    memoryUsageMB: 512  // 512 MB
  },
  outputFile: '.performance-metrics.json',
  alertOnThresholdExceeded: true
};

const performanceMonitorHook: HookPlugin = {
  name: 'performance-monitor',
  description: 'Monitor and track application performance metrics',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable performance monitoring', type: 'boolean', default: true },
    trackBuildTime: { description: 'Track build execution time', type: 'boolean', default: true },
    trackBundleSize: { description: 'Track bundle size changes', type: 'boolean', default: true },
    alertOnThresholdExceeded: { description: 'Alert when thresholds are exceeded', type: 'boolean', default: true }
  },
  makeHook: (args) => ({
    PreToolUse: [{
      matcher: 'Bash',
      hooks: [{
        type: 'command',
        command: `node -e "
          const startTime = Date.now();
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const command = input.tool_input?.command || '';
          
          if (command.includes('build') || command.includes('compile')) {
            console.log('⏱️ Starting build performance tracking...');
            require('fs').writeFileSync('.build-start-time', startTime.toString());
          }
        "`
      }]
    }],
    PostToolUse: [{
      matcher: 'Bash',
      hooks: [{
        type: 'command',
        command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const command = input.tool_input?.command || '';
          
          if (command.includes('build') || command.includes('compile')) {
            try {
              const startTime = parseInt(require('fs').readFileSync('.build-start-time', 'utf-8'));
              const duration = Date.now() - startTime;
              console.log('📊 Build completed in ' + (duration / 1000).toFixed(2) + 's');
              
              if (duration > ${args.thresholds?.buildTimeMs || 30000}) {
                console.warn('⚠️ Build time exceeded threshold!');
              }
              
              require('fs').unlinkSync('.build-start-time');
            } catch (e) {}
          }
        "`
      }]
    }]
  })
};

export default performanceMonitorHook;
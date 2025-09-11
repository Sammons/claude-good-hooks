#!/usr/bin/env node

import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const dockerDevHook: HookPlugin = {
  name: 'docker-dev',
  description: 'Docker and containerization development support',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable Docker development features', type: 'boolean', default: true },
    optimizeDockerfile: { description: 'Optimize Dockerfile', type: 'boolean', default: true },
    scanSecurity: { description: 'Scan for security issues', type: 'boolean', default: true },
    monitorImageSize: { description: 'Monitor image size changes', type: 'boolean', default: true },
  },
  makeHook: args => ({
    PostToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const filePath = input.tool_input?.file_path || '';
          
          if (filePath.includes('Dockerfile') || filePath.includes('docker-compose')) {
            console.log('🐳 Docker configuration updated - analyzing...');
            // In real implementation: run hadolint, dive, security scans, etc.
          }
        "`,
          },
        ],
      },
    ],
  }),
};

export default dockerDevHook;

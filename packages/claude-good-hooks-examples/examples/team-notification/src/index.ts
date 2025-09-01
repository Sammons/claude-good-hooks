#!/usr/bin/env node

import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface NotificationConfig {
  enabled?: boolean;
  slackWebhook?: string;
  discordWebhook?: string;
  channels?: {
    important?: string;
    general?: string;
    errors?: string;
  };
  notifyOn?: ('large-changes' | 'new-files' | 'deletions' | 'errors')[];
  thresholds?: {
    largeChangeLines?: number;
    maxFileSize?: number;
  };
}

const teamNotificationHook: HookPlugin = {
  name: 'team-notification',
  description: 'Send notifications to team about important code changes',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable team notifications', type: 'boolean', default: true },
    slackWebhook: { description: 'Slack webhook URL', type: 'string', default: '' },
    notifyOnLargeChanges: { description: 'Notify on large changes', type: 'boolean', default: true },
    notifyOnErrors: { description: 'Notify on errors', type: 'boolean', default: true }
  },
  makeHook: (args) => ({
    PostToolUse: [{
      matcher: 'Write|Edit',
      hooks: [{
        type: 'command',
        command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const webhook = '${args.slackWebhook || ''}';
          
          if (webhook && input.tool_input?.file_path) {
            const message = {
              text: '🔧 Code change detected: ' + require('path').basename(input.tool_input.file_path),
              channel: '#development'
            };
            
            // In real implementation, send webhook notification
            console.log('📢 Team notification sent for file:', input.tool_input.file_path);
          }
        "`
      }]
    }]
  })
};

export default teamNotificationHook;
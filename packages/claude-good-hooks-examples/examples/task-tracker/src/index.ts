#!/usr/bin/env node

import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const taskTrackerHook: HookPlugin = {
  name: 'task-tracker',
  description: 'Integration with project management tools and time tracking',
  version: '1.0.0',
  customArgs: {
    enabled: { description: 'Enable task tracking', type: 'boolean', default: true },
    jiraUrl: { description: 'Jira instance URL', type: 'string', default: '' },
    githubRepo: { description: 'GitHub repository', type: 'string', default: '' },
    timeTracking: { description: 'Enable automatic time tracking', type: 'boolean', default: false }
  },
  makeHook: (args) => ({
    UserPromptSubmit: [{
      hooks: [{
        type: 'command',
        command: `node -e "
          const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
          const prompt = input.prompt || '';
          
          // Look for ticket references in prompts
          const ticketMatch = prompt.match(/(JIRA-\\d+|#\\d+|ticket\\s+\\d+)/i);
          if (ticketMatch) {
            console.log('🎫 Task reference detected:', ticketMatch[1]);
            // In real implementation: update Jira, GitHub issues, start time tracking
          }
        "`
      }]
    }]
  })
};

export default taskTrackerHook;
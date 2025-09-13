import type { ClaudeSettings } from '../../../types/index.js';

// Comprehensive test configuration covering all hook types and features
export const testConfiguration = {
  version: '1.0.0',
  metadata: {
    exported: '2024-01-01T12:00:00Z',
    source: ['project'],
    generator: 'claude-good-hooks-smoke-tests',
    description: 'Comprehensive test configuration for import/export functionality',
  },
  settings: {
    hooks: {
      // PreToolUse hooks with various matchers
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'echo "Pre-tool validation for Write/Edit operations"',
              timeout: 30,
            },
          ],
        },
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'echo "Validating bash command before execution"',
            },
          ],
        },
        {
          matcher: '.*',
          hooks: [
            {
              type: 'command',
              command: 'echo "Universal pre-tool hook"',
              timeout: 15,
            },
          ],
        },
      ],
      // PostToolUse hooks for validation and cleanup
      PostToolUse: [
        {
          matcher: 'Write',
          hooks: [
            {
              type: 'command',
              command: 'echo "File written, running post-write validation"',
            },
          ],
        },
        {
          matcher: 'Edit',
          hooks: [
            {
              type: 'command',
              command: 'echo "File edited, checking formatting"',
              timeout: 25,
            },
          ],
        },
      ],
      // UserPromptSubmit for input validation
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "User prompt submitted for processing"',
            },
          ],
        },
      ],
      // PreCompact for cleanup before compaction
      PreCompact: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "Preparing for context compaction"',
              timeout: 60,
            },
          ],
        },
      ],
      // Stop hooks for cleanup
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "Claude stopped, running cleanup tasks"',
            },
          ],
        },
      ],
      // SubagentStop for task completion
      SubagentStop: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "Subagent task completed"',
              timeout: 20,
            },
          ],
        },
      ],
      // SessionEnd for final cleanup
      SessionEnd: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "Session ended, final cleanup"',
            },
          ],
        },
      ],
      // Notification hooks
      Notification: [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "Claude notification received"',
            },
          ],
        },
      ],
    },
  } as ClaudeSettings,
};

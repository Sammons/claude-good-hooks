import { describe, it, expect } from 'vitest';
import { isClaudeSettings, isHookPlugin } from '@claude-good-hooks/types';

/**
 * Real-world development team workflow scenarios
 */

describe('Development Team Workflow', () => {
  it('should support full-stack JavaScript team workflow', async () => {
    // Team configuration for a full-stack JavaScript project
    const fullStackTeamConfig = {
      hooks: {
        // Session initialization
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'git fetch --all --prune' },
              { type: 'command' as const, command: 'npm ci', timeout: 120000 },
              { type: 'command' as const, command: 'docker-compose up -d db redis', timeout: 60000 },
            ],
          },
        ],
        // Pre-operation validation
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command' as const, command: 'validate-dangerous-commands.sh' },
            ],
          },
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              { type: 'command' as const, command: 'create-backup.sh' },
              { type: 'command' as const, command: 'check-branch-protection.sh' },
            ],
          },
        ],
        // Post-operation automation
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              // Code quality
              { type: 'command' as const, command: 'eslint --fix . --ext .js,.jsx,.ts,.tsx', timeout: 30000 },
              { type: 'command' as const, command: 'prettier --write . --ignore-path .gitignore', timeout: 20000 },
              // Testing
              { type: 'command' as const, command: 'npm run test:unit -- --changed', timeout: 120000 },
              { type: 'command' as const, command: 'npm run test:lint', timeout: 30000 },
              // Type checking
              { type: 'command' as const, command: 'npm run type-check', timeout: 45000 },
            ],
          },
        ],
        // Session cleanup
        SessionEnd: [
          {
            hooks: [
              { type: 'command' as const, command: 'docker-compose down' },
              { type: 'command' as const, command: 'git status --porcelain > ~/.claude/session-summary.txt' },
              { type: 'command' as const, command: 'cleanup-temp-files.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(fullStackTeamConfig)).toBe(true);
    expect(fullStackTeamConfig.hooks.SessionStart![0].hooks).toHaveLength(3);
    expect(fullStackTeamConfig.hooks.PostToolUse![0].hooks).toHaveLength(5);
  });

  it('should support DevOps and infrastructure team workflow', async () => {
    // DevOps team configuration
    const devOpsTeamConfig = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'kubectl config current-context' },
              { type: 'command' as const, command: 'terraform version' },
              { type: 'command' as const, command: 'aws sts get-caller-identity', timeout: 10000 },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command' as const, command: 'security-policy-check.sh' },
              { type: 'command' as const, command: 'validate-infrastructure-command.sh' },
            ],
          },
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'backup-infrastructure-files.sh' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              // Infrastructure validation
              { type: 'command' as const, command: 'terraform validate', timeout: 30000 },
              { type: 'command' as const, command: 'terraform plan -out=tfplan', timeout: 120000 },
              // Security scanning
              { type: 'command' as const, command: 'checkov -f . --quiet', timeout: 60000 },
              { type: 'command' as const, command: 'tfsec .', timeout: 30000 },
              // Documentation
              { type: 'command' as const, command: 'terraform-docs markdown . > README.md' },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              { type: 'command' as const, command: 'generate-infrastructure-report.sh' },
              { type: 'command' as const, command: 'audit-infrastructure-changes.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(devOpsTeamConfig)).toBe(true);
    expect(devOpsTeamConfig.hooks.PostToolUse![0].hooks).toHaveLength(5);
  });

  it('should support data science team workflow', async () => {
    // Data science team configuration
    const dataScienceTeamConfig = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'conda activate claude-env' },
              { type: 'command' as const, command: 'jupyter --version' },
              { type: 'command' as const, command: 'python -c "import pandas, numpy, sklearn; print(\'Environment ready\')"' },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'validate-data-paths.py' },
              { type: 'command' as const, command: 'check-data-privacy.sh' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              // Code quality for Python
              { type: 'command' as const, command: 'black . --check --diff', timeout: 30000 },
              { type: 'command' as const, command: 'isort . --check-only --diff', timeout: 15000 },
              { type: 'command' as const, command: 'flake8 .', timeout: 20000 },
              { type: 'command' as const, command: 'mypy . --ignore-missing-imports', timeout: 45000 },
              // Data validation
              { type: 'command' as const, command: 'python -m pytest tests/data_validation/ -v', timeout: 60000 },
              // Notebook processing
              { type: 'command' as const, command: 'jupyter nbconvert --to html notebooks/*.ipynb' },
            ],
          },
          {
            matcher: 'NotebookEdit',
            hooks: [
              { type: 'command' as const, command: 'jupyter nbconvert --clear-output --inplace notebooks/*.ipynb' },
              { type: 'command' as const, command: 'nbstripout notebooks/*.ipynb' },
            ],
          },
        ],
        SessionEnd: [
          {
            hooks: [
              { type: 'command' as const, command: 'generate-experiment-report.py' },
              { type: 'command' as const, command: 'backup-model-artifacts.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(dataScienceTeamConfig)).toBe(true);
    expect(dataScienceTeamConfig.hooks.PostToolUse).toHaveLength(2);
  });

  it('should support mobile development team workflow', async () => {
    // Mobile development team configuration
    const mobileTeamConfig = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command' as const, command: 'flutter doctor' },
              { type: 'command' as const, command: 'pod --version' },
              { type: 'command' as const, command: 'fastlane --version' },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'validate-mobile-permissions.sh' },
              { type: 'command' as const, command: 'check-app-store-guidelines.py' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              // Flutter/Dart formatting
              { type: 'command' as const, command: 'flutter format .', timeout: 20000 },
              { type: 'command' as const, command: 'flutter analyze', timeout: 45000 },
              // Testing
              { type: 'command' as const, command: 'flutter test', timeout: 120000 },
              // iOS specific
              { type: 'command' as const, command: 'cd ios && pod install', timeout: 180000 },
              // Android specific
              { type: 'command' as const, command: 'cd android && ./gradlew assembleDebug', timeout: 300000 },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              { type: 'command' as const, command: 'generate-app-size-report.sh' },
              { type: 'command' as const, command: 'upload-debug-symbols.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(mobileTeamConfig)).toBe(true);
    expect(mobileTeamConfig.hooks.PostToolUse![0].hooks).toHaveLength(5);
  });

  it('should support enterprise security-focused workflow', async () => {
    // Enterprise security configuration
    const enterpriseSecurityConfig = {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              { type: 'command' as const, command: 'scan-prompt-for-secrets.py' },
              { type: 'command' as const, command: 'log-user-activity.sh' },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command' as const, command: 'validate-command-whitelist.sh' },
              { type: 'command' as const, command: 'check-privileged-operations.py' },
            ],
          },
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command' as const, command: 'scan-file-for-vulnerabilities.sh' },
              { type: 'command' as const, command: 'check-compliance-rules.py' },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: '*',
            hooks: [
              { type: 'command' as const, command: 'audit-all-operations.sh' },
              { type: 'command' as const, command: 'update-security-dashboard.py' },
            ],
          },
        ],
        SessionEnd: [
          {
            hooks: [
              { type: 'command' as const, command: 'generate-security-report.sh' },
              { type: 'command' as const, command: 'encrypt-session-logs.sh' },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(enterpriseSecurityConfig)).toBe(true);
    expect(enterpriseSecurityConfig.hooks.UserPromptSubmit).toBeDefined();
    expect(enterpriseSecurityConfig.hooks.PreToolUse).toHaveLength(2);
  });
});
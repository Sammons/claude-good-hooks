import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { ProjectInfo } from './project-detector.js';

/**
 * Generate starter hooks based on project type and features
 */
export function generateStarterHooks(projectInfo: ProjectInfo): ClaudeSettings {
  const hooks: ClaudeSettings = { hooks: {} };

  // Base hooks for all projects
  addBasicFileProtectionHooks(hooks);
  addGitValidationHooks(hooks);

  // Project-specific hooks
  switch (projectInfo.type) {
    case 'react':
      addReactHooks(hooks, projectInfo);
      break;
    case 'node':
    case 'typescript':
      addNodeHooks(hooks, projectInfo);
      break;
    case 'python':
      addPythonHooks(hooks, projectInfo);
      break;
    case 'go':
      addGoHooks(hooks, projectInfo);
      break;
    case 'rust':
      addRustHooks(hooks, projectInfo);
      break;
    default:
      addGenericHooks(hooks, projectInfo);
  }

  // Feature-based hooks
  if (projectInfo.hasEslint) {
    addEslintHooks(hooks);
  }

  if (projectInfo.hasPrettier) {
    addPrettierHooks(hooks);
  }

  if (projectInfo.hasJest || projectInfo.hasVitest) {
    addTestingHooks(hooks, projectInfo);
  }

  return hooks;
}

/**
 * Add basic file protection hooks
 */
function addBasicFileProtectionHooks(hooks: ClaudeSettings): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PreToolUse) hooks.hooks.PreToolUse = [];

  hooks.hooks.PreToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Protect sensitive files from modification
if echo "$1" | grep -E '\\.(env|key|pem|p12|keystore)$' > /dev/null; then
  echo "Blocked modification of sensitive file: $1" >&2
  exit 2
fi`,
      timeout: 5
    }]
  });
}

/**
 * Add Git validation hooks
 */
function addGitValidationHooks(hooks: ClaudeSettings): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit|MultiEdit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Validate that modified files don't break git status
if [ -d .git ] && ! git status --porcelain > /dev/null 2>&1; then
  echo "Git repository appears to be corrupted after file modification" >&2
  exit 2
fi`,
      timeout: 10
    }]
  });
}

/**
 * Add React-specific hooks
 */
function addReactHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  // React component validation
  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Basic React component syntax check
file_path="$1"
if [[ "$file_path" == *.tsx ]] || [[ "$file_path" == *.jsx ]]; then
  if command -v node > /dev/null; then
    node -c "$file_path" 2>/dev/null || {
      echo "React component has syntax errors in $file_path" >&2
      exit 2
    }
  fi
fi`,
      timeout: 15
    }]
  });

  // Add build validation for production builds
  if (_projectInfo.features.includes('vite')) {
    hooks.hooks.PostToolUse.push({
      matcher: "Write|Edit",
      hooks: [{
        type: "command",
        command: `#!/bin/bash
# Run Vite type checking if available
if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
  if command -v ${_projectInfo.packageManager || 'npm'} > /dev/null; then
    ${_projectInfo.packageManager || 'npm'} run type-check 2>/dev/null || true
  fi
fi`,
        timeout: 30
      }]
    });
  }
}

/**
 * Add Node.js-specific hooks
 */
function addNodeHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  // Node.js syntax validation
  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Node.js syntax check
file_path="$1"
if [[ "$file_path" == *.js ]] || [[ "$file_path" == *.mjs ]]; then
  if command -v node > /dev/null; then
    node -c "$file_path" 2>/dev/null || {
      echo "JavaScript syntax errors in $file_path" >&2
      exit 2
    }
  fi
fi`,
      timeout: 10
    }]
  });

  // TypeScript validation if applicable
  if (_projectInfo.hasTypescript) {
    hooks.hooks.PostToolUse.push({
      matcher: "Write|Edit",
      hooks: [{
        type: "command",
        command: `#!/bin/bash
# TypeScript syntax check
file_path="$1"
if [[ "$file_path" == *.ts ]] && command -v tsc > /dev/null; then
  tsc --noEmit --skipLibCheck "$file_path" 2>/dev/null || {
    echo "TypeScript syntax errors in $file_path" >&2
    exit 2
  }
fi`,
        timeout: 20
      }]
    });
  }
}

/**
 * Add Python-specific hooks
 */
function addPythonHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Python syntax check
file_path="$1"
if [[ "$file_path" == *.py ]] && command -v python3 > /dev/null; then
  python3 -m py_compile "$file_path" 2>/dev/null || {
    echo "Python syntax errors in $file_path" >&2
    exit 2
  }
fi`,
      timeout: 15
    }]
  });
}

/**
 * Add Go-specific hooks
 */
function addGoHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Go syntax check
file_path="$1"
if [[ "$file_path" == *.go ]] && command -v go > /dev/null; then
  go build -o /dev/null "$file_path" 2>/dev/null || {
    echo "Go compilation errors in $file_path" >&2
    exit 2
  }
fi`,
      timeout: 20
    }]
  });
}

/**
 * Add Rust-specific hooks
 */
function addRustHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Rust syntax check
file_path="$1"
if [[ "$file_path" == *.rs ]] && command -v rustc > /dev/null; then
  rustc --crate-type lib --emit metadata -o /dev/null "$file_path" 2>/dev/null || {
    echo "Rust compilation errors in $file_path" >&2
    exit 2
  }
fi`,
      timeout: 25
    }]
  });
}

/**
 * Add generic hooks for unknown project types
 */
function addGenericHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  // Basic file validation
  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Basic file validation
file_path="$1"
if [ -f "$file_path" ]; then
  # Check if file is readable
  if ! [ -r "$file_path" ]; then
    echo "Created file is not readable: $file_path" >&2
    exit 2
  fi
  
  # Check for obvious syntax issues in common file types
  case "$file_path" in
    *.json)
      if command -v node > /dev/null; then
        node -e "JSON.parse(require('fs').readFileSync('$file_path', 'utf8'))" 2>/dev/null || {
          echo "JSON syntax errors in $file_path" >&2
          exit 2
        }
      fi
      ;;
    *.xml)
      if command -v xmllint > /dev/null; then
        xmllint --noout "$file_path" 2>/dev/null || {
          echo "XML syntax errors in $file_path" >&2
          exit 2
        }
      fi
      ;;
  esac
fi`,
      timeout: 10
    }]
  });
}

/**
 * Add ESLint hooks
 */
function addEslintHooks(hooks: ClaudeSettings): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Run ESLint on modified files
file_path="$1"
if [[ "$file_path" == *.js ]] || [[ "$file_path" == *.jsx ]] || [[ "$file_path" == *.ts ]] || [[ "$file_path" == *.tsx ]]; then
  if command -v npx > /dev/null && [ -f .eslintrc ] || [ -f .eslintrc.js ] || [ -f .eslintrc.json ] || [ -f eslint.config.js ]; then
    npx eslint "$file_path" --quiet --no-error-on-unmatched-pattern || {
      echo "ESLint errors in $file_path" >&2
      exit 2
    }
  fi
fi`,
      timeout: 30
    }]
  });
}

/**
 * Add Prettier hooks
 */
function addPrettierHooks(hooks: ClaudeSettings): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  hooks.hooks.PostToolUse.push({
    matcher: "Write|Edit",
    hooks: [{
      type: "command",
      command: `#!/bin/bash
# Auto-format with Prettier
file_path="$1"
if command -v npx > /dev/null; then
  # Check if Prettier is configured
  if [ -f .prettierrc ] || [ -f .prettierrc.js ] || [ -f .prettierrc.json ] || [ -f prettier.config.js ]; then
    npx prettier --write "$file_path" --no-error-on-unmatched-pattern 2>/dev/null || true
  fi
fi`,
      timeout: 20
    }]
  });
}

/**
 * Add testing hooks
 */
function addTestingHooks(hooks: ClaudeSettings, _projectInfo: ProjectInfo): void {
  if (!hooks.hooks) hooks.hooks = {};
  if (!hooks.hooks.PostToolUse) hooks.hooks.PostToolUse = [];

  const testCommand = _projectInfo.hasVitest ? 'vitest run --reporter=basic --no-coverage' : 
                     _projectInfo.hasJest ? 'jest --passWithNoTests --silent' : null;

  if (testCommand) {
    hooks.hooks.PostToolUse.push({
      matcher: "Write|Edit",
      hooks: [{
        type: "command",
        command: `#!/bin/bash
# Run tests for modified files
file_path="$1"
if [[ "$file_path" == *test* ]] || [[ "$file_path" == *spec* ]]; then
  if command -v ${_projectInfo.packageManager || 'npm'} > /dev/null; then
    ${_projectInfo.packageManager || 'npm'} run test -- --testPathPattern="$file_path" --passWithNoTests 2>/dev/null || {
      echo "Tests failed for $file_path" >&2
      exit 2
    }
  fi
fi`,
        timeout: 60
      }]
    });
  }
}

/**
 * Get hook templates by category for user selection
 */
export function getAvailableTemplates(): Record<string, { name: string; description: string; hooks: ClaudeSettings }> {
  return {
    'file-protection': {
      name: 'File Protection',
      description: 'Prevents modification of sensitive files (.env, keys, etc.)',
      hooks: (() => {
        const hooks: ClaudeSettings = { hooks: {} };
        addBasicFileProtectionHooks(hooks);
        return hooks;
      })()
    },
    'git-validation': {
      name: 'Git Validation',
      description: 'Validates git repository state after modifications',
      hooks: (() => {
        const hooks: ClaudeSettings = { hooks: {} };
        addGitValidationHooks(hooks);
        return hooks;
      })()
    },
    'eslint': {
      name: 'ESLint Integration',
      description: 'Runs ESLint on modified JavaScript/TypeScript files',
      hooks: (() => {
        const hooks: ClaudeSettings = { hooks: {} };
        addEslintHooks(hooks);
        return hooks;
      })()
    },
    'prettier': {
      name: 'Prettier Integration',
      description: 'Auto-formats files with Prettier after modification',
      hooks: (() => {
        const hooks: ClaudeSettings = { hooks: {} };
        addPrettierHooks(hooks);
        return hooks;
      })()
    }
  };
}
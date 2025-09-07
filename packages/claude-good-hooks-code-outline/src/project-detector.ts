import * as fs from 'fs';
import * as path from 'path';

export interface ProjectInfo {
  type: ProjectType;
  patterns: string[];
  description: string;
}

export type ProjectType =
  | 'typescript'
  | 'typescript-react'
  | 'javascript'
  | 'javascript-react'
  | 'node'
  | 'mixed'
  | 'unknown';

interface ProjectTypeConfig {
  type: ProjectType;
  patterns: string[];
  description: string;
}

const PROJECT_TYPE_CONFIGS: ProjectTypeConfig[] = [
  {
    type: 'typescript-react',
    patterns: ['**/*.{ts,tsx}', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'TypeScript React project',
  },
  {
    type: 'typescript',
    patterns: ['**/*.ts', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'TypeScript project',
  },
  {
    type: 'javascript-react',
    patterns: ['**/*.{js,jsx}', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'JavaScript React project',
  },
  {
    type: 'javascript',
    patterns: ['**/*.js', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'JavaScript project',
  },
  {
    type: 'node',
    patterns: ['**/*.{js,mjs}', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'Node.js project',
  },
];

/**
 * Detects the project type based on file presence and configuration files
 */
export function detectProjectType(projectPath: string): ProjectInfo {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');

  let hasTypeScript = false;
  let hasReact = false;
  let hasJavaScript = false;

  // Check for TypeScript config
  if (fs.existsSync(tsconfigPath)) {
    hasTypeScript = true;
  }

  // Check package.json for dependencies
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for React
      if (allDeps.react || allDeps['@types/react']) {
        hasReact = true;
      }

      // Check for TypeScript
      if (allDeps.typescript || allDeps['@types/node']) {
        hasTypeScript = true;
      }
    } catch {
      // Ignore JSON parsing errors
    }
  }

  // Check for actual TypeScript files
  if (!hasTypeScript) {
    hasTypeScript = hasFilesWithExtensions(projectPath, ['.ts', '.tsx']);
  }

  // Check for React files
  if (!hasReact) {
    hasReact = hasFilesWithExtensions(projectPath, ['.tsx', '.jsx']);
  }

  // Check for JavaScript files
  hasJavaScript = hasFilesWithExtensions(projectPath, ['.js', '.jsx', '.mjs']);

  // Check for mixed TypeScript/JavaScript projects first
  if (hasTypeScript && hasJavaScript) {
    return {
      type: 'mixed',
      patterns: [
        '**/*.{js,ts,jsx,tsx}',
        '!node_modules/**',
        '!dist/**',
        '!build/**',
        '!coverage/**',
      ],
      description: 'Mixed JavaScript/TypeScript project',
    };
  }

  // Determine project type based on findings
  if (hasTypeScript && hasReact) {
    return {
      type: 'typescript-react',
      patterns: PROJECT_TYPE_CONFIGS.find(config => config.type === 'typescript-react')!.patterns,
      description: 'TypeScript React project',
    };
  }

  if (hasTypeScript) {
    return {
      type: 'typescript',
      patterns: PROJECT_TYPE_CONFIGS.find(config => config.type === 'typescript')!.patterns,
      description: 'TypeScript project',
    };
  }

  if (hasJavaScript && hasReact) {
    return {
      type: 'javascript-react',
      patterns: PROJECT_TYPE_CONFIGS.find(config => config.type === 'javascript-react')!.patterns,
      description: 'JavaScript React project',
    };
  }

  if (hasJavaScript) {
    // Check if it's a Node.js project specifically
    if (fs.existsSync(packageJsonPath)) {
      return {
        type: 'node',
        patterns: PROJECT_TYPE_CONFIGS.find(config => config.type === 'node')!.patterns,
        description: 'Node.js project',
      };
    }

    return {
      type: 'javascript',
      patterns: PROJECT_TYPE_CONFIGS.find(config => config.type === 'javascript')!.patterns,
      description: 'JavaScript project',
    };
  }

  // Fallback for unknown project types
  return {
    type: 'unknown',
    patterns: ['**/*.{js,ts,jsx,tsx}', '!node_modules/**', '!dist/**', '!build/**', '!coverage/**'],
    description: 'Unknown project type, scanning common file types',
  };
}

/**
 * Checks if project has files with specific extensions
 */
function hasFilesWithExtensions(projectPath: string, extensions: string[]): boolean {
  try {
    const checkDirectory = (dirPath: string, maxDepth: number = 3): boolean => {
      if (maxDepth <= 0) return false;

      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        // Skip node_modules and other build directories
        if (
          item.isDirectory() &&
          ['node_modules', 'dist', 'build', '.git', 'coverage'].includes(item.name)
        ) {
          continue;
        }

        if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext)) {
            return true;
          }
        } else if (item.isDirectory()) {
          if (checkDirectory(itemPath, maxDepth - 1)) {
            return true;
          }
        }
      }

      return false;
    };

    return checkDirectory(projectPath);
  } catch {
    return false;
  }
}

/**
 * Generates the appropriate glob pattern for code-outline based on project type
 */
export function generateGlobPattern(projectInfo: ProjectInfo): string {
  return projectInfo.patterns.join(' ');
}

/**
 * Validates that code-outline-cli can handle the detected project type
 */
export function isProjectTypeSupported(projectType: ProjectType): boolean {
  // code-outline-cli supports .js, .ts, and .tsx files
  return [
    'typescript',
    'typescript-react',
    'javascript',
    'javascript-react',
    'node',
    'mixed',
  ].includes(projectType);
}

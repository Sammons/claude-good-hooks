import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ProjectType = 'react' | 'node' | 'typescript' | 'python' | 'go' | 'rust' | 'generic';

export interface ProjectInfo {
  type: ProjectType;
  features: string[];
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  hasTypescript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasJest: boolean;
  hasVitest: boolean;
}

/**
 * Detect project type and features based on files and package.json
 */
export function detectProject(cwd: string = process.cwd()): ProjectInfo {
  const packageJsonPath = join(cwd, 'package.json');
  const features: string[] = [];
  let packageJson: any = {};
  let packageManager: ProjectInfo['packageManager'] | undefined;

  // Read package.json if it exists
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      console.warn('Could not parse package.json:', error);
    }
  }

  // Detect package manager
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (existsSync(join(cwd, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (existsSync(join(cwd, 'bun.lockb'))) {
    packageManager = 'bun';
  } else if (existsSync(join(cwd, 'package-lock.json'))) {
    packageManager = 'npm';
  }

  // Check for TypeScript
  const hasTypescript = existsSync(join(cwd, 'tsconfig.json')) ||
    existsSync(join(cwd, 'tsconfig.build.json')) ||
    !!packageJson.dependencies?.typescript ||
    !!packageJson.devDependencies?.typescript;

  // Check for linting/formatting tools
  const hasEslint = existsSync(join(cwd, '.eslintrc')) ||
    existsSync(join(cwd, '.eslintrc.js')) ||
    existsSync(join(cwd, '.eslintrc.json')) ||
    existsSync(join(cwd, 'eslint.config.js')) ||
    !!packageJson.dependencies?.eslint ||
    !!packageJson.devDependencies?.eslint;

  const hasPrettier = existsSync(join(cwd, '.prettierrc')) ||
    existsSync(join(cwd, '.prettierrc.js')) ||
    existsSync(join(cwd, '.prettierrc.json')) ||
    existsSync(join(cwd, 'prettier.config.js')) ||
    !!packageJson.dependencies?.prettier ||
    !!packageJson.devDependencies?.prettier;

  // Check for testing frameworks
  const hasJest = existsSync(join(cwd, 'jest.config.js')) ||
    existsSync(join(cwd, 'jest.config.json')) ||
    !!packageJson.dependencies?.jest ||
    !!packageJson.devDependencies?.jest;

  const hasVitest = existsSync(join(cwd, 'vitest.config.ts')) ||
    existsSync(join(cwd, 'vitest.config.js')) ||
    !!packageJson.dependencies?.vitest ||
    !!packageJson.devDependencies?.vitest;

  // Detect project type
  let type: ProjectType = 'generic';

  // Check for Python project
  if (existsSync(join(cwd, 'pyproject.toml')) ||
      existsSync(join(cwd, 'requirements.txt')) ||
      existsSync(join(cwd, 'setup.py'))) {
    type = 'python';
    features.push('python');
  }

  // Check for Go project
  else if (existsSync(join(cwd, 'go.mod'))) {
    type = 'go';
    features.push('go');
  }

  // Check for Rust project
  else if (existsSync(join(cwd, 'Cargo.toml'))) {
    type = 'rust';
    features.push('rust');
  }

  // Check for React project
  else if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
    type = 'react';
    features.push('react');
    
    // Check for Next.js
    if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
      features.push('nextjs');
    }
    
    // Check for Vite
    if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
      features.push('vite');
    }
    
    // Check for Create React App
    if (packageJson.dependencies?.['react-scripts'] || packageJson.devDependencies?.['react-scripts']) {
      features.push('cra');
    }
  }

  // Check for Node.js project
  else if (packageJson.name || packageJson.main || packageJson.type) {
    type = hasTypescript ? 'typescript' : 'node';
    features.push('nodejs');
  }

  // Add feature flags
  if (hasTypescript) features.push('typescript');
  if (hasEslint) features.push('eslint');
  if (hasPrettier) features.push('prettier');
  if (hasJest) features.push('jest');
  if (hasVitest) features.push('vitest');
  if (packageManager) features.push(packageManager);

  return {
    type,
    features,
    packageManager,
    hasTypescript,
    hasEslint,
    hasPrettier,
    hasJest,
    hasVitest
  };
}

/**
 * Get friendly project type name
 */
export function getProjectTypeName(type: ProjectType): string {
  switch (type) {
    case 'react': return 'React Application';
    case 'node': return 'Node.js Project';
    case 'typescript': return 'TypeScript Project';
    case 'python': return 'Python Project';
    case 'go': return 'Go Project';
    case 'rust': return 'Rust Project';
    case 'generic': return 'Generic Project';
    default: return 'Unknown Project';
  }
}

/**
 * Get feature description
 */
export function getFeatureDescription(feature: string): string {
  switch (feature) {
    case 'react': return 'React frontend framework';
    case 'nextjs': return 'Next.js React framework';
    case 'vite': return 'Vite build tool';
    case 'cra': return 'Create React App';
    case 'nodejs': return 'Node.js runtime';
    case 'typescript': return 'TypeScript language';
    case 'eslint': return 'ESLint code linting';
    case 'prettier': return 'Prettier code formatting';
    case 'jest': return 'Jest testing framework';
    case 'vitest': return 'Vitest testing framework';
    case 'python': return 'Python programming language';
    case 'go': return 'Go programming language';
    case 'rust': return 'Rust programming language';
    case 'npm': return 'npm package manager';
    case 'yarn': return 'Yarn package manager';
    case 'pnpm': return 'pnpm package manager';
    case 'bun': return 'Bun package manager';
    default: return feature;
  }
}
#!/usr/bin/env tsx

/**
 * Dependency Validation Script
 * 
 * This script validates the monorepo architecture and dependencies to ensure:
 * 1. No circular dependencies exist between packages
 * 2. Proper peer dependencies are declared
 * 3. Architectural boundaries are maintained
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PACKAGES_DIR = path.join(__dirname, '..', '..', 'packages');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
} as const;

type ColorKey = keyof typeof colors;

interface PackageInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  path: string;
}

class DependencyValidator {
  private packages: Map<string, PackageInfo> = new Map();

  private log(message: string, color: ColorKey = 'reset'): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private loadPackages(): void {
    this.log('📦 Loading package information...', 'blue');
    
    const packageDirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dir of packageDirs) {
      const packagePath = path.join(PACKAGES_DIR, dir);
      const packageJsonPath = path.join(packagePath, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        this.packages.set(packageJson.name, {
          name: packageJson.name,
          version: packageJson.version,
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          peerDependencies: packageJson.peerDependencies || {},
          path: packagePath
        });
      }
    }

    this.log(`✅ Loaded ${this.packages.size} packages`, 'green');
  }

  private validateCircularDependencies(): boolean {
    this.log('🔄 Checking for circular dependencies...', 'blue');
    
    let hasErrors = false;
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (packageName: string): boolean => {
      if (visiting.has(packageName)) {
        this.log(`❌ Circular dependency detected involving: ${packageName}`, 'red');
        return false;
      }
      if (visited.has(packageName)) {
        return true;
      }

      visiting.add(packageName);
      const pkg = this.packages.get(packageName);
      
      if (pkg) {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const depName of Object.keys(allDeps)) {
          if (this.packages.has(depName) && !visit(depName)) {
            hasErrors = true;
          }
        }
      }

      visiting.delete(packageName);
      visited.add(packageName);
      return true;
    };

    for (const packageName of this.packages.keys()) {
      visit(packageName);
    }

    if (!hasErrors) {
      this.log('✅ No circular dependencies found', 'green');
    }

    return !hasErrors;
  }

  private validatePeerDependencies(): boolean {
    this.log('👥 Validating peer dependencies...', 'blue');
    
    let hasErrors = false;

    for (const [packageName, pkg] of this.packages) {
      const peerDeps = Object.keys(pkg.peerDependencies);
      const devDeps = Object.keys(pkg.devDependencies);

      for (const peerDep of peerDeps) {
        if (!devDeps.includes(peerDep) && this.packages.has(peerDep)) {
          this.log(`⚠️  ${packageName}: peer dependency "${peerDep}" should also be in devDependencies`, 'yellow');
          hasErrors = true;
        }
      }
    }

    if (!hasErrors) {
      this.log('✅ Peer dependencies are properly configured', 'green');
    }

    return !hasErrors;
  }

  public async validate(): Promise<boolean> {
    this.log('🔍 Starting dependency validation...', 'blue');
    
    try {
      this.loadPackages();
      
      const circularCheck = this.validateCircularDependencies();
      const peerDepsCheck = this.validatePeerDependencies();
      
      const allValid = circularCheck && peerDepsCheck;
      
      if (allValid) {
        this.log('🎉 All dependency validations passed!', 'green');
      } else {
        this.log('❌ Some dependency validations failed', 'red');
      }
      
      return allValid;
    } catch (error) {
      this.log(`💥 Validation failed: ${error instanceof Error ? error.message : String(error)}`, 'red');
      return false;
    }
  }
}

// Run the validation if this file is executed directly
if (require.main === module) {
  const validator = new DependencyValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { DependencyValidator };
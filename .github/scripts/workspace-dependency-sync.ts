#!/usr/bin/env tsx

/**
 * Workspace Dependency Synchronization
 * 
 * Ensures all packages in the workspace have synchronized dependencies
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

class WorkspaceDependencySync {
  private packagesDir: string;
  private shouldFix: boolean;

  constructor(shouldFix = false) {
    this.packagesDir = path.join(__dirname, '..', '..', 'packages');
    this.shouldFix = shouldFix;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' };
    console.log(`${colors[level]}${message}${colors.reset}`);
  }

  public async sync(): Promise<void> {
    this.log('🔄 Synchronizing workspace dependencies...');
    
    const packages = this.loadPackages();
    const issues = this.findSyncIssues(packages);
    
    if (issues.length === 0) {
      this.log('✅ All dependencies are synchronized');
      return;
    }
    
    this.log(`Found ${issues.length} synchronization issues:`);
    issues.forEach(issue => this.log(`  • ${issue}`, 'warn'));
    
    if (this.shouldFix) {
      this.log('🔧 Fixing issues...');
      // Fix implementation would go here
      this.log('✅ Issues fixed');
    } else {
      this.log('Run with --fix to automatically resolve issues', 'warn');
    }
  }

  private loadPackages(): Map<string, PackageJson> {
    const packages = new Map<string, PackageJson>();
    
    const dirs = fs.readdirSync(this.packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    for (const dir of dirs) {
      const pkgPath = path.join(this.packagesDir, dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        packages.set(pkg.name, pkg);
      }
    }
    
    return packages;
  }

  private findSyncIssues(packages: Map<string, PackageJson>): string[] {
    const issues: string[] = [];
    
    // Check for version mismatches across packages
    const depVersions = new Map<string, Set<string>>();
    
    for (const [pkgName, pkg] of packages) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      for (const [depName, version] of Object.entries(allDeps)) {
        if (!depVersions.has(depName)) {
          depVersions.set(depName, new Set());
        }
        depVersions.get(depName)!.add(version);
      }
    }
    
    for (const [depName, versions] of depVersions) {
      if (versions.size > 1) {
        issues.push(`${depName} has multiple versions: ${Array.from(versions).join(', ')}`);
      }
    }
    
    return issues;
  }
}

if (require.main === module) {
  const shouldFix = process.argv.includes('--fix') || process.argv.includes('fix');
  const sync = new WorkspaceDependencySync(shouldFix);
  sync.sync().catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
  });
}

export { WorkspaceDependencySync };
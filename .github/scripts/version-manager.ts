#!/usr/bin/env tsx

// ==============================================================================
// Claude Good Hooks - Version Management Automation
// ==============================================================================
//
// OVERVIEW:
// Comprehensive version management for the Claude Good Hooks monorepo,
// handling cross-package versioning, git tag management, and dependency updates.
//
// FEATURES:
// - Automatic version bumping based on conventional commits
// - Cross-package dependency synchronization
// - Git tag creation and management
// - Version validation and consistency checks
// - Workspace dependency updates
// - Rollback capabilities
//
// VERSION STRATEGIES:
// - Unified: All packages use the same version (recommended)
// - Independent: Each package has its own version
// - Selective: Some packages follow unified, others independent
//
// USAGE:
// tsx .github/scripts/version-manager.ts [command] [options]
// 
// COMMANDS:
// bump <type>          Bump version (major, minor, patch, or specific version)
// sync                 Synchronize cross-package dependencies
// validate             Validate version consistency
// tag                  Create and push git tags
// rollback <version>   Rollback to previous version
// preview              Preview version changes without applying
//
// OPTIONS:
// --strategy <type>    Version strategy: unified, independent, selective
// --packages <list>    Comma-separated list of packages to affect
// --dry-run           Preview changes without applying
// --force             Force changes even with validation warnings
// --tag-only          Only create git tags without version changes
// --skip-git          Skip git operations
// --workspace-deps    Update workspace dependencies
//
// EXAMPLES:
// tsx .github/scripts/version-manager.ts bump minor --dry-run
// tsx .github/scripts/version-manager.ts sync --workspace-deps
// tsx .github/scripts/version-manager.ts tag --tag-only
// tsx .github/scripts/version-manager.ts rollback 1.0.0
//
// ==============================================================================

import { Command } from 'commander';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';

// ==============================================================================
// Types and Interfaces
// ==============================================================================

interface PackageInfo {
  name: string;
  path: string;
  currentVersion: string;
  packageJson: any;
  dependencies: Map<string, string>;
  devDependencies: Map<string, string>;
  peerDependencies: Map<string, string>;
}

interface VersionBumpResult {
  package: string;
  oldVersion: string;
  newVersion: string;
  bumpType: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface VersionManagerOptions {
  strategy: 'unified' | 'independent' | 'selective';
  packages?: string[];
  dryRun: boolean;
  force: boolean;
  tagOnly: boolean;
  skipGit: boolean;
  workspaceDeps: boolean;
}

interface DependencyUpdate {
  package: string;
  dependency: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
  oldVersion: string;
  newVersion: string;
}

// ==============================================================================
// Constants
// ==============================================================================

const WORKSPACE_ROOT = process.cwd();
const PACKAGES_DIR = join(WORKSPACE_ROOT, 'packages');

const PUBLISHABLE_PACKAGES = [
  'claude-good-hooks-cli',
  'claude-good-hooks-types',
  'claude-good-hooks-template-hook',
  'dirty-good-claude-hook'
];

const INTERNAL_PACKAGES = [
  'claude-good-hooks-smoke-tests',
  'claude-good-hooks-examples',
  'landing-page'
];

// ==============================================================================
// Utility Functions
// ==============================================================================

/**
 * Execute shell command with error handling
 */
function execCommand(command: string, silent: boolean = false): string {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: WORKSPACE_ROOT
    }).toString().trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute shell command safely (returns false on error)
 */
function execCommandSafe(command: string): boolean {
  try {
    execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: WORKSPACE_ROOT
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate semantic version format
 */
function isValidSemVer(version: string): boolean {
  return /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version);
}

/**
 * Bump semantic version
 */
function bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = version.split('.');
  const [major, minor, patch] = parts.map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
}

/**
 * Compare semantic versions
 */
function compareVersions(a: string, b: string): number {
  const normalize = (v: string) => v.split('.').map(Number);
  const [aMajor, aMinor, aPatch] = normalize(a);
  const [bMajor, bMinor, bPatch] = normalize(b);
  
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

// ==============================================================================
// Package Discovery and Analysis
// ==============================================================================

/**
 * Discover all packages in the workspace
 */
function discoverPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  
  // Get package directories
  const packageDirs = glob.sync('packages/*/package.json', { 
    cwd: WORKSPACE_ROOT 
  });
  
  for (const packageFile of packageDirs) {
    const packagePath = join(WORKSPACE_ROOT, packageFile);
    const packageDir = join(WORKSPACE_ROOT, packageFile.replace('/package.json', ''));
    
    if (!existsSync(packagePath)) continue;
    
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      const packageName = packageJson.name || packageFile.split('/')[1];
      
      const dependencies = new Map<string, string>();
      const devDependencies = new Map<string, string>();
      const peerDependencies = new Map<string, string>();
      
      // Extract dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          dependencies.set(name, version as string);
        });
      }
      
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          devDependencies.set(name, version as string);
        });
      }
      
      if (packageJson.peerDependencies) {
        Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
          peerDependencies.set(name, version as string);
        });
      }
      
      packages.push({
        name: packageName,
        path: packageDir,
        currentVersion: packageJson.version || '0.0.0',
        packageJson,
        dependencies,
        devDependencies,
        peerDependencies
      });
      
    } catch (error) {
      console.warn(`Failed to parse package.json at ${packagePath}:`, error);
    }
  }
  
  return packages;
}

/**
 * Filter packages based on options
 */
function filterPackages(packages: PackageInfo[], options: VersionManagerOptions): PackageInfo[] {
  if (!options.packages || options.packages.length === 0) {
    return packages;
  }
  
  const targetNames = new Set(options.packages);
  return packages.filter(pkg => 
    targetNames.has(pkg.name) || 
    targetNames.has(pkg.name.replace('@sammons/', ''))
  );
}

/**
 * Find workspace dependencies between packages
 */
function findWorkspaceDependencies(packages: PackageInfo[]): Map<string, string[]> {
  const workspaceDeps = new Map<string, string[]>();
  const packageNames = new Set(packages.map(pkg => pkg.name));
  
  for (const pkg of packages) {
    const deps: string[] = [];
    
    // Check all dependency types
    [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].forEach(depMap => {
      for (const [depName] of depMap) {
        if (packageNames.has(depName)) {
          deps.push(depName);
        }
      }
    });
    
    if (deps.length > 0) {
      workspaceDeps.set(pkg.name, deps);
    }
  }
  
  return workspaceDeps;
}

// ==============================================================================
// Version Validation
// ==============================================================================

/**
 * Validate version consistency across packages
 */
function validateVersionConsistency(packages: PackageInfo[], strategy: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (strategy === 'unified') {
    // All publishable packages should have the same version
    const publishablePackages = packages.filter(pkg => 
      PUBLISHABLE_PACKAGES.includes(pkg.name.replace('@sammons/', ''))
    );
    
    if (publishablePackages.length > 0) {
      const baseVersion = publishablePackages[0].currentVersion;
      
      for (const pkg of publishablePackages.slice(1)) {
        if (pkg.currentVersion !== baseVersion) {
          errors.push(
            `Version mismatch in unified strategy: ${pkg.name} has ${pkg.currentVersion}, expected ${baseVersion}`
          );
        }
      }
    }
  }
  
  // Validate workspace dependencies
  const workspaceDeps = findWorkspaceDependencies(packages);
  
  for (const [packageName, deps] of workspaceDeps) {
    const pkg = packages.find(p => p.name === packageName)!;
    
    for (const depName of deps) {
      const depPkg = packages.find(p => p.name === depName);
      if (!depPkg) continue;
      
      // Check if workspace dependency version matches actual version
      const declaredVersion = 
        pkg.dependencies.get(depName) ||
        pkg.devDependencies.get(depName) ||
        pkg.peerDependencies.get(depName);
      
      if (declaredVersion && declaredVersion !== 'workspace:*') {
        if (declaredVersion.startsWith('^') || declaredVersion.startsWith('~')) {
          // Allow semver ranges, but warn about potential issues
          warnings.push(
            `${packageName} depends on ${depName} with range ${declaredVersion}, current version is ${depPkg.currentVersion}`
          );
        } else if (declaredVersion !== depPkg.currentVersion) {
          errors.push(
            `${packageName} depends on ${depName}@${declaredVersion}, but current version is ${depPkg.currentVersion}`
          );
        }
      }
    }
  }
  
  // Validate semantic version format
  for (const pkg of packages) {
    if (!isValidSemVer(pkg.currentVersion)) {
      errors.push(`Invalid semantic version in ${pkg.name}: ${pkg.currentVersion}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ==============================================================================
// Version Bumping
// ==============================================================================

/**
 * Calculate next version from conventional commits
 */
function calculateVersionFromCommits(currentVersion: string, since?: string): { version: string; type: 'major' | 'minor' | 'patch' } {
  try {
    // Get commits since last tag or specified reference
    const sinceRef = since || execCommand('git describe --tags --abbrev=0', true);
    const commits = execCommand(`git log ${sinceRef}..HEAD --pretty=format:"%s"`, true).split('\n').filter(Boolean);
    
    let hasBreaking = false;
    let hasFeature = false;
    let hasFix = false;
    
    for (const commit of commits) {
      if (commit.includes('BREAKING CHANGE:') || commit.match(/^[^:]+!:/)) {
        hasBreaking = true;
        break;
      } else if (commit.startsWith('feat:') || commit.startsWith('feat(')) {
        hasFeature = true;
      } else if (commit.startsWith('fix:') || commit.startsWith('fix(')) {
        hasFix = true;
      }
    }
    
    let bumpType: 'major' | 'minor' | 'patch';
    if (hasBreaking) {
      bumpType = 'major';
    } else if (hasFeature) {
      bumpType = 'minor';
    } else {
      bumpType = 'patch';
    }
    
    return {
      version: bumpVersion(currentVersion, bumpType),
      type: bumpType
    };
  } catch (error) {
    console.warn('Failed to analyze commits, defaulting to patch bump:', error);
    return {
      version: bumpVersion(currentVersion, 'patch'),
      type: 'patch'
    };
  }
}

/**
 * Bump package versions
 */
function bumpPackageVersions(
  packages: PackageInfo[], 
  bumpTypeOrVersion: string,
  options: VersionManagerOptions
): VersionBumpResult[] {
  const results: VersionBumpResult[] = [];
  const targetPackages = filterPackages(packages, options);
  
  for (const pkg of targetPackages) {
    let newVersion: string;
    let bumpType: string;
    
    if (isValidSemVer(bumpTypeOrVersion)) {
      // Specific version provided
      newVersion = bumpTypeOrVersion;
      bumpType = 'custom';
    } else if (['major', 'minor', 'patch'].includes(bumpTypeOrVersion)) {
      // Bump type provided
      newVersion = bumpVersion(pkg.currentVersion, bumpTypeOrVersion as any);
      bumpType = bumpTypeOrVersion;
    } else if (bumpTypeOrVersion === 'auto') {
      // Auto-detect from commits
      const autoResult = calculateVersionFromCommits(pkg.currentVersion);
      newVersion = autoResult.version;
      bumpType = autoResult.type;
    } else {
      throw new Error(`Invalid bump type or version: ${bumpTypeOrVersion}`);
    }
    
    results.push({
      package: pkg.name,
      oldVersion: pkg.currentVersion,
      newVersion,
      bumpType
    });
    
    if (!options.dryRun) {
      // Update package.json
      const updatedPackageJson = {
        ...pkg.packageJson,
        version: newVersion
      };
      
      const packageJsonPath = join(pkg.path, 'package.json');
      writeFileSync(packageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n');
      
      console.log(`✅ Updated ${pkg.name}: ${pkg.currentVersion} → ${newVersion}`);
    } else {
      console.log(`🔍 Would update ${pkg.name}: ${pkg.currentVersion} → ${newVersion}`);
    }
  }
  
  return results;
}

// ==============================================================================
// Dependency Synchronization
// ==============================================================================

/**
 * Update workspace dependencies
 */
function updateWorkspaceDependencies(packages: PackageInfo[], options: VersionManagerOptions): DependencyUpdate[] {
  const updates: DependencyUpdate[] = [];
  const packageVersions = new Map(packages.map(pkg => [pkg.name, pkg.currentVersion]));
  
  for (const pkg of packages) {
    const packageJsonPath = join(pkg.path, 'package.json');
    let packageJson = { ...pkg.packageJson };
    let hasChanges = false;
    
    // Update dependencies
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
      const deps = packageJson[depType];
      if (!deps) return;
      
      Object.keys(deps).forEach(depName => {
        const currentDepVersion = deps[depName];
        const actualVersion = packageVersions.get(depName);
        
        if (actualVersion && currentDepVersion !== 'workspace:*') {
          let newDepVersion: string;
          
          if (options.workspaceDeps) {
            // Use workspace protocol
            newDepVersion = 'workspace:*';
          } else if (currentDepVersion.startsWith('^') || currentDepVersion.startsWith('~')) {
            // Update range while preserving prefix
            const prefix = currentDepVersion[0];
            newDepVersion = prefix + actualVersion;
          } else {
            // Exact version
            newDepVersion = actualVersion;
          }
          
          if (newDepVersion !== currentDepVersion) {
            updates.push({
              package: pkg.name,
              dependency: depName,
              type: depType as any,
              oldVersion: currentDepVersion,
              newVersion: newDepVersion
            });
            
            deps[depName] = newDepVersion;
            hasChanges = true;
          }
        }
      });
    });
    
    if (hasChanges && !options.dryRun) {
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated dependencies in ${pkg.name}`);
    } else if (hasChanges) {
      console.log(`🔍 Would update dependencies in ${pkg.name}`);
    }
  }
  
  return updates;
}

// ==============================================================================
// Git Operations
// ==============================================================================

/**
 * Create and push git tags
 */
function createGitTags(packages: PackageInfo[], options: VersionManagerOptions): void {
  if (options.skipGit) {
    console.log('⏭️  Skipping git operations');
    return;
  }
  
  // Check if git repository is clean
  if (!execCommandSafe('git diff-index --quiet HEAD --')) {
    if (!options.force) {
      throw new Error('Git working directory is not clean. Use --force to override or commit your changes.');
    }
    console.log('⚠️  Working directory is not clean, but proceeding due to --force flag');
  }
  
  const targetPackages = filterPackages(packages, options);
  
  if (options.strategy === 'unified') {
    // Create single unified tag
    const version = targetPackages[0]?.currentVersion;
    if (!version) {
      throw new Error('No packages found for tagging');
    }
    
    const tagName = `v${version}`;
    
    if (!options.dryRun) {
      try {
        execCommand(`git tag -a "${tagName}" -m "Release ${tagName}"`);
        execCommand(`git push origin "${tagName}"`);
        console.log(`✅ Created and pushed tag: ${tagName}`);
      } catch (error) {
        console.error(`❌ Failed to create/push tag ${tagName}:`, error);
        throw error;
      }
    } else {
      console.log(`🔍 Would create tag: ${tagName}`);
    }
  } else {
    // Create individual package tags
    for (const pkg of targetPackages) {
      const tagName = `${pkg.name.replace('@sammons/', '')}@${pkg.currentVersion}`;
      
      if (!options.dryRun) {
        try {
          execCommand(`git tag -a "${tagName}" -m "Release ${pkg.name}@${pkg.currentVersion}"`);
          execCommand(`git push origin "${tagName}"`);
          console.log(`✅ Created and pushed tag: ${tagName}`);
        } catch (error) {
          console.error(`❌ Failed to create/push tag ${tagName}:`, error);
          // Continue with other packages
        }
      } else {
        console.log(`🔍 Would create tag: ${tagName}`);
      }
    }
  }
}

/**
 * Rollback to previous version
 */
function rollbackVersion(packages: PackageInfo[], targetVersion: string, options: VersionManagerOptions): void {
  console.log(`🔄 Rolling back to version ${targetVersion}...`);
  
  // Validate target version
  if (!isValidSemVer(targetVersion)) {
    throw new Error(`Invalid target version: ${targetVersion}`);
  }
  
  const targetPackages = filterPackages(packages, options);
  
  for (const pkg of targetPackages) {
    if (compareVersions(targetVersion, pkg.currentVersion) >= 0) {
      console.warn(`⚠️  ${pkg.name} current version ${pkg.currentVersion} is not newer than target ${targetVersion}`);
      if (!options.force) {
        throw new Error(`Cannot rollback ${pkg.name} to ${targetVersion}. Use --force to override.`);
      }
    }
    
    if (!options.dryRun) {
      const updatedPackageJson = {
        ...pkg.packageJson,
        version: targetVersion
      };
      
      const packageJsonPath = join(pkg.path, 'package.json');
      writeFileSync(packageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n');
      
      console.log(`✅ Rolled back ${pkg.name}: ${pkg.currentVersion} → ${targetVersion}`);
    } else {
      console.log(`🔍 Would rollback ${pkg.name}: ${pkg.currentVersion} → ${targetVersion}`);
    }
  }
  
  // Update workspace dependencies if requested
  if (options.workspaceDeps) {
    console.log('🔄 Updating workspace dependencies after rollback...');
    const updatedPackages = packages.map(pkg => ({
      ...pkg,
      currentVersion: targetPackages.some(tp => tp.name === pkg.name) ? targetVersion : pkg.currentVersion
    }));
    updateWorkspaceDependencies(updatedPackages, options);
  }
  
  // Create rollback git tag
  if (!options.skipGit && !options.dryRun) {
    const tagName = `rollback-v${targetVersion}-${Date.now()}`;
    try {
      execCommand(`git tag -a "${tagName}" -m "Rollback to ${targetVersion}"`);
      console.log(`✅ Created rollback tag: ${tagName}`);
    } catch (error) {
      console.warn('⚠️  Failed to create rollback tag:', error);
    }
  }
}

// ==============================================================================
// Main Commands
// ==============================================================================

/**
 * Bump command implementation
 */
function bumpCommand(bumpTypeOrVersion: string, options: VersionManagerOptions): void {
  console.log(`🚀 Bumping versions (${bumpTypeOrVersion}) with strategy: ${options.strategy}`);
  
  const packages = discoverPackages();
  const validation = validateVersionConsistency(packages, options.strategy);
  
  if (!validation.isValid) {
    console.error('❌ Version validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (!options.force) {
      throw new Error('Fix validation errors or use --force to proceed');
    }
    console.log('⚠️  Proceeding with validation errors due to --force flag');
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Validation warnings:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  // Bump versions
  const results = bumpPackageVersions(packages, bumpTypeOrVersion, options);
  
  if (results.length === 0) {
    console.log('ℹ️  No packages to bump');
    return;
  }
  
  console.log('\n📋 Version bump summary:');
  results.forEach(result => {
    console.log(`  ${result.package}: ${result.oldVersion} → ${result.newVersion} (${result.bumpType})`);
  });
  
  // Update workspace dependencies
  if (options.workspaceDeps) {
    console.log('\n🔄 Updating workspace dependencies...');
    const updatedPackages = discoverPackages(); // Re-read after version updates
    const depUpdates = updateWorkspaceDependencies(updatedPackages, options);
    
    if (depUpdates.length > 0) {
      console.log('📋 Dependency updates:');
      depUpdates.forEach(update => {
        console.log(`  ${update.package}: ${update.dependency} ${update.oldVersion} → ${update.newVersion}`);
      });
    }
  }
  
  // Create git tags
  if (!options.tagOnly && !options.skipGit) {
    console.log('\n🏷️  Creating git tags...');
    const updatedPackages = discoverPackages(); // Re-read after all updates
    createGitTags(updatedPackages, options);
  }
  
  if (options.dryRun) {
    console.log('\n🔍 This was a dry run. No changes were applied.');
  } else {
    console.log('\n✅ Version bump completed successfully!');
  }
}

/**
 * Sync command implementation
 */
function syncCommand(options: VersionManagerOptions): void {
  console.log('🔄 Synchronizing workspace dependencies...');
  
  const packages = discoverPackages();
  const updates = updateWorkspaceDependencies(packages, options);
  
  if (updates.length === 0) {
    console.log('ℹ️  All workspace dependencies are already synchronized');
    return;
  }
  
  console.log('📋 Dependency synchronization summary:');
  updates.forEach(update => {
    console.log(`  ${update.package}: ${update.dependency} ${update.oldVersion} → ${update.newVersion}`);
  });
  
  if (options.dryRun) {
    console.log('\n🔍 This was a dry run. No changes were applied.');
  } else {
    console.log('\n✅ Workspace dependencies synchronized!');
  }
}

/**
 * Validate command implementation
 */
function validateCommand(options: VersionManagerOptions): void {
  console.log('🔍 Validating version consistency...');
  
  const packages = discoverPackages();
  const validation = validateVersionConsistency(packages, options.strategy);
  
  if (validation.isValid) {
    console.log('✅ All version validations passed!');
  } else {
    console.log('❌ Version validation failed:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Validation warnings:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  // Additional statistics
  console.log('\n📊 Package statistics:');
  console.log(`  Total packages: ${packages.length}`);
  console.log(`  Publishable packages: ${packages.filter(p => PUBLISHABLE_PACKAGES.includes(p.name.replace('@sammons/', ''))).length}`);
  console.log(`  Internal packages: ${packages.filter(p => INTERNAL_PACKAGES.includes(p.name.replace('@sammons/', ''))).length}`);
  
  const workspaceDeps = findWorkspaceDependencies(packages);
  console.log(`  Workspace dependencies: ${workspaceDeps.size} packages with internal deps`);
  
  if (!validation.isValid) {
    process.exit(1);
  }
}

/**
 * Tag command implementation
 */
function tagCommand(options: VersionManagerOptions): void {
  console.log('🏷️  Creating git tags...');
  
  const packages = discoverPackages();
  createGitTags(packages, options);
  
  if (options.dryRun) {
    console.log('\n🔍 This was a dry run. No tags were created.');
  } else {
    console.log('\n✅ Git tags created successfully!');
  }
}

/**
 * Rollback command implementation
 */
function rollbackCommand(targetVersion: string, options: VersionManagerOptions): void {
  console.log(`🔄 Rolling back to version ${targetVersion}...`);
  
  const packages = discoverPackages();
  rollbackVersion(packages, targetVersion, options);
  
  if (options.dryRun) {
    console.log('\n🔍 This was a dry run. No rollback was performed.');
  } else {
    console.log('\n✅ Rollback completed successfully!');
  }
}

/**
 * Preview command implementation
 */
function previewCommand(bumpTypeOrVersion: string, options: VersionManagerOptions): void {
  console.log('🔍 Previewing version changes...');
  
  const dryRunOptions = { ...options, dryRun: true };
  
  try {
    bumpCommand(bumpTypeOrVersion, dryRunOptions);
  } catch (error) {
    console.error('❌ Preview failed:', error);
    process.exit(1);
  }
}

// ==============================================================================
// CLI Setup
// ==============================================================================

const program = new Command();

program
  .name('version-manager')
  .description('Version management automation for Claude Good Hooks monorepo')
  .version('1.0.0')
  .option('--strategy <type>', 'Version strategy: unified, independent, selective', 'unified')
  .option('--packages <list>', 'Comma-separated list of packages to affect')
  .option('--dry-run', 'Preview changes without applying', false)
  .option('--force', 'Force changes even with validation warnings', false)
  .option('--tag-only', 'Only create git tags without version changes', false)
  .option('--skip-git', 'Skip git operations', false)
  .option('--workspace-deps', 'Update workspace dependencies', false);

// Bump command
program
  .command('bump <type>')
  .description('Bump package versions (major, minor, patch, auto, or specific version)')
  .action((type: string, options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      bumpCommand(type, mergedOptions);
    } catch (error: any) {
      console.error('❌ Bump command failed:', error.message);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Synchronize workspace dependencies')
  .action((options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      syncCommand(mergedOptions);
    } catch (error: any) {
      console.error('❌ Sync command failed:', error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate version consistency')
  .action((options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      validateCommand(mergedOptions);
    } catch (error: any) {
      console.error('❌ Validate command failed:', error.message);
      process.exit(1);
    }
  });

// Tag command
program
  .command('tag')
  .description('Create and push git tags')
  .action((options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      tagCommand(mergedOptions);
    } catch (error: any) {
      console.error('❌ Tag command failed:', error.message);
      process.exit(1);
    }
  });

// Rollback command
program
  .command('rollback <version>')
  .description('Rollback to previous version')
  .action((version: string, options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      rollbackCommand(version, mergedOptions);
    } catch (error: any) {
      console.error('❌ Rollback command failed:', error.message);
      process.exit(1);
    }
  });

// Preview command
program
  .command('preview <type>')
  .description('Preview version changes without applying them')
  .action((type: string, options: any, command: Command) => {
    const globalOptions = command.parent?.opts() || {};
    const mergedOptions: VersionManagerOptions = {
      ...globalOptions,
      packages: globalOptions.packages?.split(',').map((p: string) => p.trim())
    };
    
    try {
      previewCommand(type, mergedOptions);
    } catch (error: any) {
      console.error('❌ Preview command failed:', error.message);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();
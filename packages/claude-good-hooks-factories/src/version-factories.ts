/**
 * Version Management Factories
 * 
 * Utilities for handling hook versioning, compatibility checking,
 * deprecation warnings, and migration assistance.
 */

import type {
  HookVersion,
  HookDependency,
  EnhancedHookPlugin,
  VersionCompatibility,
  HookPlugin
} from '@sammons/claude-good-hooks-types';

/**
 * Parses a semantic version string into a HookVersion object
 * 
 * @param versionString - Semantic version string (e.g., "1.2.3-beta.1+build.123")
 * @returns Parsed version object
 * 
 * @example
 * ```typescript
 * import { parseVersion } from '@sammons/claude-good-hooks-factories';
 * 
 * const version = parseVersion("2.1.0-alpha.1");
 * // { major: 2, minor: 1, patch: 0, prerelease: "alpha.1" }
 * ```
 */
export function parseVersion(versionString: string): HookVersion {
  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/;
  const match = versionString.match(regex);
  
  if (!match) {
    throw new Error(`Invalid version string: ${versionString}`);
  }
  
  const [, major, minor, patch, prerelease, build] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease,
    build
  };
}

/**
 * Formats a HookVersion object as a semantic version string
 * 
 * @param version - Version object to format
 * @returns Formatted version string
 * 
 * @example
 * ```typescript
 * import { formatVersion } from '@sammons/claude-good-hooks-factories';
 * 
 * const versionString = formatVersion({
 *   major: 1, minor: 2, patch: 3, prerelease: "beta.1"
 * });
 * // "1.2.3-beta.1"
 * ```
 */
export function formatVersion(version: HookVersion): string {
  let versionString = `${version.major}.${version.minor}.${version.patch}`;
  
  if (version.prerelease) {
    versionString += `-${version.prerelease}`;
  }
  
  if (version.build) {
    versionString += `+${version.build}`;
  }
  
  return versionString;
}

/**
 * Compares two versions and returns comparison result
 * 
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 * 
 * @example
 * ```typescript
 * import { compareVersions } from '@sammons/claude-good-hooks-factories';
 * 
 * const result = compareVersions("1.2.3", "1.2.4");
 * // -1 (version1 is older)
 * ```
 */
export function compareVersions(version1: string | HookVersion, version2: string | HookVersion): number {
  const v1 = typeof version1 === 'string' ? parseVersion(version1) : version1;
  const v2 = typeof version2 === 'string' ? parseVersion(version2) : version2;
  
  // Compare major, minor, patch
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (v1[key] !== v2[key]) {
      return v1[key] - v2[key];
    }
  }
  
  // Handle prerelease versions
  if (!v1.prerelease && !v2.prerelease) return 0;
  if (!v1.prerelease && v2.prerelease) return 1;
  if (v1.prerelease && !v2.prerelease) return -1;
  
  // Compare prerelease identifiers
  const pre1 = v1.prerelease!.split('.');
  const pre2 = v2.prerelease!.split('.');
  
  const maxLength = Math.max(pre1.length, pre2.length);
  for (let i = 0; i < maxLength; i++) {
    const a = pre1[i] || '';
    const b = pre2[i] || '';
    
    if (a === b) continue;
    
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    
    return a.localeCompare(b);
  }
  
  return 0;
}

/**
 * Checks if a version satisfies a compatibility constraint
 * 
 * @param version - Version to check
 * @param compatibility - Compatibility constraints
 * @returns True if version is compatible
 * 
 * @example
 * ```typescript
 * import { checkCompatibility } from '@sammons/claude-good-hooks-factories';
 * 
 * const isCompatible = checkCompatibility("1.2.3", {
 *   minimumVersion: "1.0.0",
 *   maximumVersion: "2.0.0",
 *   excludedVersions: ["1.2.2"]
 * });
 * ```
 */
export function checkCompatibility(
  version: string | HookVersion,
  compatibility: VersionCompatibility
): boolean {
  const versionStr = typeof version === 'string' ? version : formatVersion(version);
  
  // Check minimum version
  if (compatibility.minimumVersion && 
      compareVersions(version, compatibility.minimumVersion) < 0) {
    return false;
  }
  
  // Check maximum version
  if (compatibility.maximumVersion && 
      compareVersions(version, compatibility.maximumVersion) > 0) {
    return false;
  }
  
  // Check excluded versions
  if (compatibility.excludedVersions?.includes(versionStr)) {
    return false;
  }
  
  return true;
}

/**
 * Creates an enhanced hook plugin with version management features
 * 
 * @param plugin - Base hook plugin
 * @param enhancements - Version and metadata enhancements
 * @returns Enhanced hook plugin
 * 
 * @example
 * ```typescript
 * import { enhanceHookWithVersion } from '@sammons/claude-good-hooks-factories';
 * 
 * const enhanced = enhanceHookWithVersion(baseHook, {
 *   semanticVersion: parseVersion("1.2.0"),
 *   dependencies: [
 *     { name: "git", version: ">=2.0.0" }
 *   ],
 *   deprecation: {
 *     since: "1.1.0",
 *     replacement: "new-hook",
 *     reason: "Better performance"
 *   }
 * });
 * ```
 */
export function enhanceHookWithVersion(
  plugin: HookPlugin,
  enhancements: {
    semanticVersion?: HookVersion;
    dependencies?: HookDependency[];
    deprecation?: {
      since: string;
      replacement?: string;
      reason?: string;
    };
  }
): EnhancedHookPlugin {
  return {
    ...plugin,
    semanticVersion: enhancements.semanticVersion,
    dependencies: enhancements.dependencies,
    deprecated: enhancements.deprecation ? {
      since: enhancements.deprecation.since,
      replacement: enhancements.deprecation.replacement,
      reason: enhancements.deprecation.reason
    } : undefined
  };
}

/**
 * Validates hook dependencies and checks compatibility
 * 
 * @param dependencies - Array of dependencies to validate
 * @param availableVersions - Map of available package versions
 * @returns Validation result with missing or incompatible dependencies
 * 
 * @example
 * ```typescript
 * import { validateDependencies } from '@sammons/claude-good-hooks-factories';
 * 
 * const result = validateDependencies([
 *   { name: "git", version: ">=2.0.0" },
 *   { name: "node", version: "^18.0.0" }
 * ], new Map([
 *   ["git", "2.39.0"],
 *   ["node", "18.17.0"]
 * ]));
 * ```
 */
export function validateDependencies(
  dependencies: HookDependency[],
  availableVersions: Map<string, string>
): {
  valid: boolean;
  missing: HookDependency[];
  incompatible: Array<{ dependency: HookDependency; availableVersion: string; }>;
} {
  const missing: HookDependency[] = [];
  const incompatible: Array<{ dependency: HookDependency; availableVersion: string; }> = [];
  
  for (const dependency of dependencies) {
    const availableVersion = availableVersions.get(dependency.name);
    
    if (!availableVersion) {
      if (!dependency.optional) {
        missing.push(dependency);
      }
      continue;
    }
    
    if (!satisfiesVersionConstraint(availableVersion, dependency.version)) {
      incompatible.push({ dependency, availableVersion });
    }
  }
  
  return {
    valid: missing.length === 0 && incompatible.length === 0,
    missing,
    incompatible
  };
}

/**
 * Generates deprecation warnings for deprecated hooks
 * 
 * @param plugin - Enhanced hook plugin
 * @returns Deprecation warning message, or null if not deprecated
 * 
 * @example
 * ```typescript
 * import { generateDeprecationWarning } from '@sammons/claude-good-hooks-factories';
 * 
 * const warning = generateDeprecationWarning(enhancedHook);
 * if (warning) {
 *   console.warn(warning);
 * }
 * ```
 */
export function generateDeprecationWarning(plugin: EnhancedHookPlugin): string | null {
  if (!plugin.deprecated) {
    return null;
  }
  
  let warning = `⚠️  Hook "${plugin.name}" has been deprecated since version ${plugin.deprecated.since}`;
  
  if (plugin.deprecated.reason) {
    warning += `\n   Reason: ${plugin.deprecated.reason}`;
  }
  
  if (plugin.deprecated.replacement) {
    warning += `\n   Please use "${plugin.deprecated.replacement}" instead`;
  }
  
  return warning;
}

/**
 * Creates a migration guide for upgrading between hook versions
 * 
 * @param fromVersion - Current version
 * @param toVersion - Target version
 * @param changes - Array of breaking changes
 * @returns Migration guide text
 * 
 * @example
 * ```typescript
 * import { createMigrationGuide } from '@sammons/claude-good-hooks-factories';
 * 
 * const guide = createMigrationGuide("1.0.0", "2.0.0", [
 *   {
 *     version: "2.0.0",
 *     change: "Renamed 'config' argument to 'settings'",
 *     action: "Update your hook configuration to use 'settings' instead of 'config'"
 *   }
 * ]);
 * ```
 */
export function createMigrationGuide(
  fromVersion: string,
  toVersion: string,
  changes: Array<{
    version: string;
    change: string;
    action: string;
  }>
): string {
  const relevantChanges = changes.filter(change => 
    compareVersions(change.version, fromVersion) > 0 &&
    compareVersions(change.version, toVersion) <= 0
  );
  
  if (relevantChanges.length === 0) {
    return `No breaking changes between ${fromVersion} and ${toVersion}`;
  }
  
  let guide = `Migration Guide: ${fromVersion} → ${toVersion}\n`;
  guide += '='.repeat(50) + '\n\n';
  
  for (const change of relevantChanges) {
    guide += `📦 Version ${change.version}:\n`;
    guide += `   ${change.change}\n`;
    guide += `   Action: ${change.action}\n\n`;
  }
  
  return guide;
}

/**
 * Increments a version based on the type of change
 * 
 * @param version - Current version
 * @param changeType - Type of change (major, minor, patch)
 * @returns Incremented version
 * 
 * @example
 * ```typescript
 * import { incrementVersion } from '@sammons/claude-good-hooks-factories';
 * 
 * const newVersion = incrementVersion("1.2.3", "minor");
 * // "1.3.0"
 * ```
 */
export function incrementVersion(
  version: string | HookVersion,
  changeType: 'major' | 'minor' | 'patch'
): HookVersion {
  const v = typeof version === 'string' ? parseVersion(version) : { ...version };
  
  switch (changeType) {
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
      v.patch += 1;
      break;
  }
  
  // Clear prerelease and build metadata on increment
  delete v.prerelease;
  delete v.build;
  
  return v;
}

// Helper functions

function satisfiesVersionConstraint(version: string, constraint: string): boolean {
  // Parse constraint operators
  const operators = ['>=', '<=', '>', '<', '^', '~', '='];
  let operator = '=';
  let constraintVersion = constraint;
  
  for (const op of operators) {
    if (constraint.startsWith(op)) {
      operator = op;
      constraintVersion = constraint.slice(op.length);
      break;
    }
  }
  
  const comparison = compareVersions(version, constraintVersion);
  
  switch (operator) {
    case '>=': return comparison >= 0;
    case '<=': return comparison <= 0;
    case '>': return comparison > 0;
    case '<': return comparison < 0;
    case '=': return comparison === 0;
    case '^': return satisfiesCaretConstraint(version, constraintVersion);
    case '~': return satisfiesTildeConstraint(version, constraintVersion);
    default: return false;
  }
}

function satisfiesCaretConstraint(version: string, constraint: string): boolean {
  const v = parseVersion(version);
  const c = parseVersion(constraint);
  
  // Major version must match
  if (v.major !== c.major) return false;
  
  // Version must be >= constraint
  return compareVersions(version, constraint) >= 0;
}

function satisfiesTildeConstraint(version: string, constraint: string): boolean {
  const v = parseVersion(version);
  const c = parseVersion(constraint);
  
  // Major and minor versions must match
  if (v.major !== c.major || v.minor !== c.minor) return false;
  
  // Patch version must be >= constraint patch
  return v.patch >= c.patch;
}
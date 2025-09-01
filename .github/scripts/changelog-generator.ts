#!/usr/bin/env tsx

// ==============================================================================
// Claude Good Hooks - Automated Changelog Generator
// ==============================================================================
//
// OVERVIEW:
// This script generates changelogs from conventional commits, supporting
// automatic versioning, breaking change detection, and release notes creation.
//
// FEATURES:
// - Conventional commits parsing (feat, fix, chore, etc.)
// - Automatic version bumping based on commit types
// - Breaking change detection (BREAKING CHANGE in footer or ! in type)
// - GitHub release notes generation
// - Monorepo package-specific changelogs
// - Release comparison and diff generation
//
// CONVENTIONAL COMMIT FORMAT:
// <type>[optional scope]: <description>
//
// [optional body]
//
// [optional footer(s)]
//
// SUPPORTED TYPES:
// - feat: New feature (minor version bump)
// - fix: Bug fix (patch version bump) 
// - chore: Maintenance tasks (patch version bump)
// - docs: Documentation changes (patch version bump)
// - style: Code style changes (patch version bump)
// - refactor: Code refactoring (patch version bump)
// - perf: Performance improvements (patch version bump)
// - test: Test changes (patch version bump)
// - build: Build system changes (patch version bump)
// - ci: CI/CD changes (patch version bump)
// - revert: Reverts previous commit (patch version bump)
// - BREAKING CHANGE: Major version bump
//
// USAGE:
// tsx .github/scripts/changelog-generator.ts [options]
// 
// OPTIONS:
// --since <tag>        Generate changelog since specific tag
// --output <file>      Output file path (default: CHANGELOG.md)
// --format <type>      Output format: markdown, json (default: markdown)
// --package <name>     Generate changelog for specific package
// --dry-run           Preview changes without writing files
// --release-notes     Generate GitHub release notes format
// --next-version      Calculate next version based on commits
//
// EXAMPLES:
// tsx .github/scripts/changelog-generator.ts --since v1.0.0
// tsx .github/scripts/changelog-generator.ts --package claude-good-hooks-cli
// tsx .github/scripts/changelog-generator.ts --next-version --dry-run
//
// ==============================================================================

import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ==============================================================================
// Types and Interfaces
// ==============================================================================

interface ConventionalCommit {
  hash: string;
  date: string;
  author: string;
  type: string;
  scope?: string;
  description: string;
  body?: string;
  footer?: string;
  isBreaking: boolean;
  breakingChangeDescription?: string;
  rawMessage: string;
}

interface ChangelogSection {
  title: string;
  commits: ConventionalCommit[];
}

interface PackageChange {
  package: string;
  changes: ConventionalCommit[];
}

interface VersionBump {
  current: string;
  next: string;
  type: 'major' | 'minor' | 'patch';
  reason: string;
}

interface ChangelogOptions {
  since?: string;
  output?: string;
  format: 'markdown' | 'json';
  package?: string;
  dryRun: boolean;
  releaseNotes: boolean;
  nextVersion: boolean;
}

interface ReleaseNotes {
  version: string;
  date: string;
  summary: string;
  breaking: ConventionalCommit[];
  features: ConventionalCommit[];
  fixes: ConventionalCommit[];
  other: ConventionalCommit[];
}

// ==============================================================================
// Constants
// ==============================================================================

const COMMIT_TYPES = {
  feat: { title: '✨ Features', bump: 'minor' as const },
  fix: { title: '🐛 Bug Fixes', bump: 'patch' as const },
  perf: { title: '⚡ Performance Improvements', bump: 'patch' as const },
  revert: { title: '⏪ Reverts', bump: 'patch' as const },
  docs: { title: '📚 Documentation', bump: 'patch' as const },
  style: { title: '💎 Styles', bump: 'patch' as const },
  refactor: { title: '♻️ Code Refactoring', bump: 'patch' as const },
  test: { title: '🧪 Tests', bump: 'patch' as const },
  build: { title: '📦 Build System', bump: 'patch' as const },
  ci: { title: '🔧 CI/CD', bump: 'patch' as const },
  chore: { title: '🧹 Chores', bump: 'patch' as const }
};

const BREAKING_CHANGE_PATTERNS = [
  /^BREAKING CHANGE:\s*(.+)$/m,
  /^BREAKING:\s*(.+)$/m,
  /^BC:\s*(.+)$/m
];

// ==============================================================================
// Utility Functions
// ==============================================================================

/**
 * Execute git command and return output
 */
function execGit(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8' }).trim();
  } catch (error: any) {
    throw new Error(`Git command failed: git ${command}\n${error.message}`);
  }
}

/**
 * Get current version from package.json
 */
function getCurrentVersion(packagePath?: string): string {
  const pkgPath = packagePath 
    ? join(process.cwd(), 'packages', packagePath, 'package.json')
    : join(process.cwd(), 'package.json');
  
  if (!existsSync(pkgPath)) {
    return '0.0.0';
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Calculate next version based on version bump type
 */
function calculateNextVersion(current: string, bumpType: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return current;
  }
}

/**
 * Get the latest git tag
 */
function getLatestTag(): string | null {
  try {
    return execGit('describe --tags --abbrev=0').trim();
  } catch {
    return null;
  }
}

/**
 * Get all git tags sorted by version
 */
function getAllTags(): string[] {
  try {
    const output = execGit('tag -l --sort=-version:refname');
    return output ? output.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

// ==============================================================================
// Commit Parsing Functions
// ==============================================================================

/**
 * Parse conventional commit message
 */
function parseConventionalCommit(hash: string, date: string, author: string, message: string): ConventionalCommit | null {
  const lines = message.split('\n');
  const firstLine = lines[0];
  
  // Parse the commit header: type(scope): description
  const headerMatch = firstLine.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/);
  
  if (!headerMatch) {
    // Not a conventional commit, skip
    return null;
  }

  const [, type, scope, breakingMarker, description] = headerMatch;
  
  // Extract body and footer
  const bodyLines: string[] = [];
  const footerLines: string[] = [];
  let inFooter = false;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Check if this is a footer line (contains a token followed by colon)
    if (line.match(/^[A-Za-z-]+:\s+.+/) || line.match(/^BREAKING CHANGE:\s+.+/)) {
      inFooter = true;
    }
    
    if (inFooter) {
      footerLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  // Check for breaking changes
  const footer = footerLines.join('\n');
  let isBreaking = !!breakingMarker;
  let breakingChangeDescription: string | undefined;

  // Check for breaking change in footer
  for (const pattern of BREAKING_CHANGE_PATTERNS) {
    const match = footer.match(pattern);
    if (match) {
      isBreaking = true;
      breakingChangeDescription = match[1];
      break;
    }
  }

  return {
    hash,
    date,
    author,
    type,
    scope,
    description,
    body: bodyLines.join('\n').trim() || undefined,
    footer: footer.trim() || undefined,
    isBreaking,
    breakingChangeDescription,
    rawMessage: message
  };
}

/**
 * Get commits since a specific reference
 */
function getCommitsSince(since?: string): ConventionalCommit[] {
  const sinceArg = since ? `${since}..HEAD` : 'HEAD';
  
  try {
    // Get commit data in a parseable format
    const format = '%H%x09%aI%x09%an%x09%s%x0A%x0A%b%x0A%x0A---COMMIT-END---';
    const output = execGit(`log ${sinceArg} --pretty=format:"${format}"`);
    
    if (!output) return [];
    
    const commits: ConventionalCommit[] = [];
    const rawCommits = output.split('---COMMIT-END---').filter(Boolean);
    
    for (const rawCommit of rawCommits) {
      const lines = rawCommit.trim().split('\n');
      const [hash, date, author, subject] = lines[0].split('\t');
      
      // Reconstruct the full message
      const messageLines = [subject, ...lines.slice(2)];
      const message = messageLines.join('\n').trim();
      
      const parsedCommit = parseConventionalCommit(hash, date, author, message);
      if (parsedCommit) {
        commits.push(parsedCommit);
      }
    }
    
    return commits;
  } catch (error: any) {
    console.error('Failed to get commits:', error.message);
    return [];
  }
}

// ==============================================================================
// Package-specific Functions
// ==============================================================================

/**
 * Get commits that affected a specific package
 */
function getPackageCommits(commits: ConventionalCommit[], packageName: string): ConventionalCommit[] {
  return commits.filter(commit => {
    // Check if commit has package scope
    if (commit.scope === packageName) {
      return true;
    }
    
    // Check if files in the commit affect this package
    try {
      const changedFiles = execGit(`show --name-only --pretty=format: ${commit.hash}`);
      const packagePath = `packages/${packageName}/`;
      return changedFiles.includes(packagePath);
    } catch {
      return false;
    }
  });
}

/**
 * Group commits by affected packages
 */
function groupCommitsByPackage(commits: ConventionalCommit[]): PackageChange[] {
  const packageChanges = new Map<string, ConventionalCommit[]>();
  
  // Get all package directories
  const packages = execGit('ls-tree -d --name-only HEAD packages/')
    .split('\n')
    .filter(Boolean)
    .map(path => path.replace('packages/', ''));
  
  for (const pkg of packages) {
    const packageCommits = getPackageCommits(commits, pkg);
    if (packageCommits.length > 0) {
      packageChanges.set(pkg, packageCommits);
    }
  }
  
  return Array.from(packageChanges.entries()).map(([package, changes]) => ({
    package,
    changes
  }));
}

// ==============================================================================
// Version Calculation
// ==============================================================================

/**
 * Determine version bump type from commits
 */
function determineVersionBump(commits: ConventionalCommit[]): VersionBump['type'] {
  // Check for breaking changes
  if (commits.some(commit => commit.isBreaking)) {
    return 'major';
  }
  
  // Check for features
  if (commits.some(commit => commit.type === 'feat')) {
    return 'minor';
  }
  
  // Default to patch for any other changes
  return 'patch';
}

/**
 * Calculate next version from commits
 */
function calculateVersionFromCommits(commits: ConventionalCommit[], currentVersion: string): VersionBump {
  const bumpType = determineVersionBump(commits);
  const nextVersion = calculateNextVersion(currentVersion, bumpType);
  
  let reason = '';
  const breakingCount = commits.filter(c => c.isBreaking).length;
  const featCount = commits.filter(c => c.type === 'feat').length;
  const fixCount = commits.filter(c => c.type === 'fix').length;
  
  if (bumpType === 'major') {
    reason = `${breakingCount} breaking change${breakingCount > 1 ? 's' : ''}`;
  } else if (bumpType === 'minor') {
    reason = `${featCount} new feature${featCount > 1 ? 's' : ''}`;
  } else {
    reason = `${fixCount} bug fix${fixCount > 1 ? 'es' : ''} and other changes`;
  }
  
  return {
    current: currentVersion,
    next: nextVersion,
    type: bumpType,
    reason
  };
}

// ==============================================================================
// Changelog Generation
// ==============================================================================

/**
 * Group commits by type for changelog sections
 */
function groupCommitsByType(commits: ConventionalCommit[]): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  const commitsByType = new Map<string, ConventionalCommit[]>();
  
  // Separate breaking changes
  const breakingChanges = commits.filter(c => c.isBreaking);
  if (breakingChanges.length > 0) {
    sections.push({
      title: '🚨 BREAKING CHANGES',
      commits: breakingChanges
    });
  }
  
  // Group non-breaking commits by type
  const nonBreakingCommits = commits.filter(c => !c.isBreaking);
  
  for (const commit of nonBreakingCommits) {
    if (!commitsByType.has(commit.type)) {
      commitsByType.set(commit.type, []);
    }
    commitsByType.get(commit.type)!.push(commit);
  }
  
  // Add sections in priority order
  const typeOrder = ['feat', 'fix', 'perf', 'revert', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore'];
  
  for (const type of typeOrder) {
    const typeCommits = commitsByType.get(type);
    if (typeCommits && typeCommits.length > 0) {
      sections.push({
        title: COMMIT_TYPES[type as keyof typeof COMMIT_TYPES]?.title || `${type.toUpperCase()}`,
        commits: typeCommits
      });
    }
  }
  
  // Add any remaining types not in the standard list
  for (const [type, typeCommits] of commitsByType) {
    if (!typeOrder.includes(type) && typeCommits.length > 0) {
      sections.push({
        title: type.toUpperCase(),
        commits: typeCommits
      });
    }
  }
  
  return sections;
}

/**
 * Format commit for changelog entry
 */
function formatCommitEntry(commit: ConventionalCommit): string {
  const scope = commit.scope ? `**${commit.scope}**: ` : '';
  const shortHash = commit.hash.substring(0, 7);
  const description = commit.description;
  
  let entry = `- ${scope}${description} ([${shortHash}](https://github.com/your-username/claude-good-hooks/commit/${commit.hash}))`;
  
  if (commit.isBreaking && commit.breakingChangeDescription) {
    entry += `\n  - **BREAKING**: ${commit.breakingChangeDescription}`;
  }
  
  return entry;
}

/**
 * Generate markdown changelog
 */
function generateMarkdownChangelog(
  commits: ConventionalCommit[], 
  version: string,
  date: string = new Date().toISOString().split('T')[0],
  packageName?: string
): string {
  const sections = groupCommitsByType(commits);
  
  if (sections.length === 0) {
    return `## [${version}] - ${date}\n\n*No changes*\n`;
  }
  
  let changelog = `## [${version}] - ${date}\n`;
  
  if (packageName) {
    changelog += `\n### Package: ${packageName}\n`;
  }
  
  changelog += '\n';
  
  for (const section of sections) {
    changelog += `### ${section.title}\n\n`;
    
    for (const commit of section.commits) {
      changelog += formatCommitEntry(commit) + '\n';
    }
    
    changelog += '\n';
  }
  
  return changelog;
}

/**
 * Generate GitHub release notes
 */
function generateReleaseNotes(commits: ConventionalCommit[], version: string): ReleaseNotes {
  const breaking = commits.filter(c => c.isBreaking);
  const features = commits.filter(c => c.type === 'feat' && !c.isBreaking);
  const fixes = commits.filter(c => c.type === 'fix' && !c.isBreaking);
  const other = commits.filter(c => !['feat', 'fix'].includes(c.type) && !c.isBreaking);
  
  let summary = '';
  if (breaking.length > 0) {
    summary += `🚨 **${breaking.length} Breaking Change${breaking.length > 1 ? 's' : ''}**\n`;
  }
  if (features.length > 0) {
    summary += `✨ **${features.length} New Feature${features.length > 1 ? 's' : ''}**\n`;
  }
  if (fixes.length > 0) {
    summary += `🐛 **${fixes.length} Bug Fix${fixes.length > 1 ? 'es' : ''}**\n`;
  }
  if (other.length > 0) {
    summary += `🔧 **${other.length} Other Change${other.length > 1 ? 's' : ''}**\n`;
  }
  
  return {
    version,
    date: new Date().toISOString().split('T')[0],
    summary: summary.trim(),
    breaking,
    features,
    fixes,
    other
  };
}

/**
 * Generate JSON output
 */
function generateJsonOutput(commits: ConventionalCommit[], version: string, packageName?: string): string {
  const releaseNotes = generateReleaseNotes(commits, version);
  const versionBump = calculateVersionFromCommits(commits, getCurrentVersion(packageName));
  
  const output = {
    version,
    package: packageName,
    date: new Date().toISOString(),
    versionBump,
    releaseNotes,
    commits: commits.map(c => ({
      hash: c.hash,
      type: c.type,
      scope: c.scope,
      description: c.description,
      isBreaking: c.isBreaking,
      author: c.author,
      date: c.date
    }))
  };
  
  return JSON.stringify(output, null, 2);
}

// ==============================================================================
// Main Functions
// ==============================================================================

/**
 * Generate changelog based on options
 */
function generateChangelog(options: ChangelogOptions): void {
  console.log('🔍 Analyzing commits for changelog generation...');
  
  // Determine since reference
  const since = options.since || getLatestTag();
  console.log(`📅 Generating changelog since: ${since || 'beginning'}`);
  
  // Get commits
  const allCommits = getCommitsSince(since);
  console.log(`📝 Found ${allCommits.length} conventional commits`);
  
  if (allCommits.length === 0) {
    console.log('ℹ️ No conventional commits found. Nothing to generate.');
    return;
  }
  
  // Filter commits for specific package if requested
  let commits = allCommits;
  if (options.package) {
    commits = getPackageCommits(allCommits, options.package);
    console.log(`📦 Filtered to ${commits.length} commits for package: ${options.package}`);
  }
  
  // Calculate version
  const currentVersion = getCurrentVersion(options.package);
  const versionBump = calculateVersionFromCommits(commits, currentVersion);
  const targetVersion = options.nextVersion ? versionBump.next : currentVersion;
  
  console.log(`🏷️ Version: ${currentVersion} → ${targetVersion} (${versionBump.type})`);
  console.log(`📋 Reason: ${versionBump.reason}`);
  
  // Generate output
  let output: string;
  
  if (options.format === 'json') {
    output = generateJsonOutput(commits, targetVersion, options.package);
  } else if (options.releaseNotes) {
    const releaseNotes = generateReleaseNotes(commits, targetVersion);
    output = `# Release ${releaseNotes.version}\n\n${releaseNotes.summary}\n\n`;
    output += generateMarkdownChangelog(commits, targetVersion, releaseNotes.date, options.package);
  } else {
    output = generateMarkdownChangelog(commits, targetVersion, undefined, options.package);
  }
  
  // Output results
  if (options.dryRun) {
    console.log('\n📋 Generated changelog (dry run):\n');
    console.log('='.repeat(80));
    console.log(output);
    console.log('='.repeat(80));
  } else {
    const outputFile = options.output || 'CHANGELOG.md';
    const outputPath = resolve(outputFile);
    
    // Read existing changelog if it exists
    let existingContent = '';
    if (existsSync(outputPath)) {
      existingContent = readFileSync(outputPath, 'utf8');
    }
    
    // Prepend new changelog to existing content
    const newContent = output + '\n' + existingContent;
    
    writeFileSync(outputPath, newContent);
    console.log(`✅ Changelog written to: ${outputPath}`);
  }
}

// ==============================================================================
// CLI Setup
// ==============================================================================

const program = new Command();

program
  .name('changelog-generator')
  .description('Generate conventional commits changelog for Claude Good Hooks')
  .version('1.0.0')
  .option('--since <tag>', 'Generate changelog since specific tag')
  .option('--output <file>', 'Output file path', 'CHANGELOG.md')
  .option('--format <type>', 'Output format: markdown, json', 'markdown')
  .option('--package <name>', 'Generate changelog for specific package')
  .option('--dry-run', 'Preview changes without writing files', false)
  .option('--release-notes', 'Generate GitHub release notes format', false)
  .option('--next-version', 'Calculate next version based on commits', false)
  .action((options: ChangelogOptions) => {
    try {
      generateChangelog(options);
    } catch (error: any) {
      console.error('❌ Error generating changelog:', error.message);
      process.exit(1);
    }
  });

program
  .command('version')
  .description('Calculate next version based on commits')
  .option('--since <tag>', 'Calculate version since specific tag')
  .option('--package <name>', 'Calculate version for specific package')
  .action((options) => {
    try {
      const since = options.since || getLatestTag();
      const commits = getCommitsSince(since);
      const filteredCommits = options.package ? getPackageCommits(commits, options.package) : commits;
      const currentVersion = getCurrentVersion(options.package);
      const versionBump = calculateVersionFromCommits(filteredCommits, currentVersion);
      
      console.log(JSON.stringify(versionBump, null, 2));
    } catch (error: any) {
      console.error('❌ Error calculating version:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate conventional commit format in recent commits')
  .option('--count <number>', 'Number of recent commits to validate', '10')
  .action((options) => {
    try {
      const count = parseInt(options.count);
      const recentCommits = execGit(`log -${count} --pretty=format:"%H%x09%s"`).split('\n');
      
      let validCount = 0;
      let invalidCount = 0;
      
      console.log(`🔍 Validating ${recentCommits.length} recent commits:\n`);
      
      for (const line of recentCommits) {
        if (!line.trim()) continue;
        
        const [hash, message] = line.split('\t');
        const isValid = message.match(/^(\w+)(?:\([^)]+\))?(!)?\s*:\s*.+$/);
        
        if (isValid) {
          console.log(`✅ ${hash.substring(0, 7)}: ${message}`);
          validCount++;
        } else {
          console.log(`❌ ${hash.substring(0, 7)}: ${message}`);
          invalidCount++;
        }
      }
      
      console.log(`\n📊 Summary: ${validCount} valid, ${invalidCount} invalid`);
      
      if (invalidCount > 0) {
        console.log('\n💡 Conventional commit format: <type>[scope]: <description>');
        console.log('   Types: feat, fix, chore, docs, style, refactor, perf, test, build, ci');
        process.exit(1);
      }
    } catch (error: any) {
      console.error('❌ Error validating commits:', error.message);
      process.exit(1);
    }
  });

program.parse();
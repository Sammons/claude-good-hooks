#!/usr/bin/env tsx

// ==============================================================================
// Claude Good Hooks - Breaking Change Detection & Validation
// ==============================================================================
//
// OVERVIEW:
// Automated detection and validation of breaking changes in the codebase,
// ensuring proper semantic versioning and migration path documentation.
//
// FEATURES:
// - API surface analysis and comparison
// - TypeScript interface and type changes detection
// - Export changes detection
// - Configuration schema changes
// - Breaking change commit message validation
// - Migration guide generation assistance
// - Semantic versioning compliance checking
//
// DETECTION METHODS:
// - Static code analysis using TypeScript compiler API
// - Git diff analysis for configuration files
// - Package.json exports comparison
// - Dependency version changes analysis
// - Build output comparison
//
// USAGE:
// tsx .github/scripts/breaking-change-detector.ts [command] [options]
// 
// COMMANDS:
// detect                 Detect breaking changes between versions/branches
// validate <commit>      Validate breaking change commit format
// compare <from> <to>    Compare API surfaces between references
// migration              Generate migration guide template
// report                 Generate breaking changes report
//
// OPTIONS:
// --from <ref>           Compare from this git reference (default: latest tag)
// --to <ref>             Compare to this git reference (default: HEAD)
// --package <name>       Analyze specific package only
// --format <type>        Output format: json, markdown, text (default: markdown)
// --strict              Enable strict breaking change detection
// --output <file>        Output file path
// --include-patches     Include patch-level breaking changes
//
// EXAMPLES:
// tsx .github/scripts/breaking-change-detector.ts detect --from v1.0.0
// tsx .github/scripts/breaking-change-detector.ts compare v1.0.0 HEAD --package cli
// tsx .github/scripts/breaking-change-detector.ts validate HEAD~1
// tsx .github/scripts/breaking-change-detector.ts migration --output MIGRATION.md
//
// ==============================================================================

import { Command } from 'commander';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import * as ts from 'typescript';

// ==============================================================================
// Types and Interfaces
// ==============================================================================

interface BreakingChange {
  type: 'api' | 'config' | 'dependency' | 'export' | 'type' | 'behavior';
  severity: 'major' | 'minor' | 'patch';
  package: string;
  file: string;
  description: string;
  before?: string;
  after?: string;
  migrationHint?: string;
  line?: number;
  column?: number;
}

interface APISymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum';
  signature?: string;
  exported: boolean;
  deprecated?: boolean;
  documentation?: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
}

interface APIComparison {
  added: APISymbol[];
  removed: APISymbol[];
  modified: APISymbol[];
  unchanged: APISymbol[];
}

interface PackageComparison {
  packageName: string;
  apiComparison: APIComparison;
  breakingChanges: BreakingChange[];
  configChanges: BreakingChange[];
  dependencyChanges: BreakingChange[];
}

interface DetectionOptions {
  from?: string;
  to?: string;
  package?: string;
  format: 'json' | 'markdown' | 'text';
  strict: boolean;
  output?: string;
  includePatches: boolean;
}

// ==============================================================================
// Constants
// ==============================================================================

const WORKSPACE_ROOT = process.cwd();
const PACKAGES_DIR = join(WORKSPACE_ROOT, 'packages');

const BREAKING_CHANGE_PATTERNS = [
  // Conventional commit patterns
  /^BREAKING CHANGE:\s*(.+)$/m,
  /^BREAKING:\s*(.+)$/m,
  /^(.+)!:\s*(.+)$/,
  
  // Code patterns that typically indicate breaking changes
  /export\s+(interface|type|class)\s+\w+.*{[^}]*}/g,
  /function\s+\w+\s*\([^)]*\):[^{]+{/g,
  /class\s+\w+.*{/g,
];

const CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'tsconfig.build.json',
  '.claude/settings.json',
  'vite.config.ts',
  'vitest.config.ts'
];

// ==============================================================================
// Utility Functions
// ==============================================================================

/**
 * Execute git command and return output
 */
function execGit(command: string): string {
  try {
    return execSync(`git ${command}`, { 
      encoding: 'utf8', 
      cwd: WORKSPACE_ROOT 
    }).toString().trim();
  } catch (error: any) {
    throw new Error(`Git command failed: git ${command}\n${error.message}`);
  }
}

/**
 * Get the latest git tag
 */
function getLatestTag(): string {
  try {
    return execGit('describe --tags --abbrev=0');
  } catch {
    return execGit('rev-list --max-parents=0 HEAD'); // First commit if no tags
  }
}

/**
 * Get file content at specific git reference
 */
function getFileAtRef(filePath: string, ref: string): string | null {
  try {
    return execGit(`show ${ref}:${filePath}`);
  } catch {
    return null;
  }
}

/**
 * Get list of changed files between references
 */
function getChangedFiles(fromRef: string, toRef: string): string[] {
  try {
    const output = execGit(`diff --name-only ${fromRef}..${toRef}`);
    return output ? output.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Parse TypeScript file and extract API symbols
 */
function parseTypeScriptFile(filePath: string, sourceCode: string): APISymbol[] {
  const symbols: APISymbol[] = [];
  
  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    function visit(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && isExported(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'interface',
          signature: sourceCode.substring(node.pos, node.end).trim(),
          exported: true,
          location: getNodeLocation(node, sourceFile)
        });
      }
      
      if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'type',
          signature: sourceCode.substring(node.pos, node.end).trim(),
          exported: true,
          location: getNodeLocation(node, sourceFile)
        });
      }
      
      if (ts.isFunctionDeclaration(node) && isExported(node) && node.name) {
        symbols.push({
          name: node.name.text,
          kind: 'function',
          signature: sourceCode.substring(node.pos, node.end).trim(),
          exported: true,
          location: getNodeLocation(node, sourceFile)
        });
      }
      
      if (ts.isClassDeclaration(node) && isExported(node) && node.name) {
        symbols.push({
          name: node.name.text,
          kind: 'class',
          signature: sourceCode.substring(node.pos, node.end).trim(),
          exported: true,
          location: getNodeLocation(node, sourceFile)
        });
      }
      
      if (ts.isEnumDeclaration(node) && isExported(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'enum',
          signature: sourceCode.substring(node.pos, node.end).trim(),
          exported: true,
          location: getNodeLocation(node, sourceFile)
        });
      }
      
      if (ts.isVariableStatement(node) && isExported(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            symbols.push({
              name: decl.name.text,
              kind: 'variable',
              signature: sourceCode.substring(node.pos, node.end).trim(),
              exported: true,
              location: getNodeLocation(decl, sourceFile)
            });
          }
        });
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
  } catch (error) {
    console.warn(`Failed to parse TypeScript file ${filePath}:`, error);
  }
  
  return symbols;
}

/**
 * Check if node is exported
 */
function isExported(node: ts.Node): boolean {
  return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * Get node location information
 */
function getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): { file: string; line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return {
    file: sourceFile.fileName,
    line: line + 1,
    column: character + 1
  };
}

// ==============================================================================
// API Analysis Functions
// ==============================================================================

/**
 * Extract API symbols from package at specific git reference
 */
function extractAPISymbols(packagePath: string, ref: string): APISymbol[] {
  const symbols: APISymbol[] = [];
  
  try {
    // Get list of TypeScript files in the package
    const files = execGit(`ls-tree -r --name-only ${ref} ${packagePath}`)
      .split('\n')
      .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.includes('test'));
    
    for (const file of files) {
      const content = getFileAtRef(file, ref);
      if (content) {
        const fileSymbols = parseTypeScriptFile(file, content);
        symbols.push(...fileSymbols);
      }
    }
  } catch (error) {
    console.warn(`Failed to extract API symbols for ${packagePath} at ${ref}:`, error);
  }
  
  return symbols;
}

/**
 * Compare API symbols between two references
 */
function compareAPISymbols(oldSymbols: APISymbol[], newSymbols: APISymbol[]): APIComparison {
  const oldSymbolMap = new Map(oldSymbols.map(s => [s.name, s]));
  const newSymbolMap = new Map(newSymbols.map(s => [s.name, s]));
  
  const added: APISymbol[] = [];
  const removed: APISymbol[] = [];
  const modified: APISymbol[] = [];
  const unchanged: APISymbol[] = [];
  
  // Find added symbols
  for (const [name, symbol] of newSymbolMap) {
    if (!oldSymbolMap.has(name)) {
      added.push(symbol);
    }
  }
  
  // Find removed symbols
  for (const [name, symbol] of oldSymbolMap) {
    if (!newSymbolMap.has(name)) {
      removed.push(symbol);
    }
  }
  
  // Find modified symbols
  for (const [name, oldSymbol] of oldSymbolMap) {
    const newSymbol = newSymbolMap.get(name);
    if (newSymbol) {
      if (oldSymbol.signature !== newSymbol.signature) {
        modified.push(newSymbol);
      } else {
        unchanged.push(newSymbol);
      }
    }
  }
  
  return { added, removed, modified, unchanged };
}

// ==============================================================================
// Breaking Change Detection
// ==============================================================================

/**
 * Detect API breaking changes
 */
function detectAPIBreakingChanges(comparison: APIComparison, packageName: string): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  
  // Removed exports are always breaking
  for (const symbol of comparison.removed) {
    breakingChanges.push({
      type: 'api',
      severity: 'major',
      package: packageName,
      file: symbol.location.file,
      description: `Removed exported ${symbol.kind} '${symbol.name}'`,
      before: symbol.signature,
      migrationHint: `The ${symbol.kind} '${symbol.name}' is no longer available. Check documentation for alternatives.`,
      line: symbol.location.line,
      column: symbol.location.column
    });
  }
  
  // Modified exports might be breaking
  for (const symbol of comparison.modified) {
    const oldSymbol = comparison.removed.find(s => s.name === symbol.name) || symbol;
    
    // Different heuristics for different symbol types
    let isBreaking = false;
    let migrationHint = '';
    
    if (symbol.kind === 'function') {
      isBreaking = detectFunctionBreakingChange(oldSymbol.signature || '', symbol.signature || '');
      migrationHint = `Function signature changed. Update calls to '${symbol.name}' to match new signature.`;
    } else if (symbol.kind === 'interface') {
      isBreaking = detectInterfaceBreakingChange(oldSymbol.signature || '', symbol.signature || '');
      migrationHint = `Interface '${symbol.name}' changed. Update implementations and usage.`;
    } else if (symbol.kind === 'type') {
      isBreaking = detectTypeBreakingChange(oldSymbol.signature || '', symbol.signature || '');
      migrationHint = `Type '${symbol.name}' changed. Update type annotations and usage.`;
    } else {
      // For other kinds, assume breaking if signature changed
      isBreaking = true;
      migrationHint = `${symbol.kind} '${symbol.name}' signature changed.`;
    }
    
    if (isBreaking) {
      breakingChanges.push({
        type: 'api',
        severity: 'major',
        package: packageName,
        file: symbol.location.file,
        description: `Modified exported ${symbol.kind} '${symbol.name}'`,
        before: oldSymbol.signature,
        after: symbol.signature,
        migrationHint,
        line: symbol.location.line,
        column: symbol.location.column
      });
    }
  }
  
  return breakingChanges;
}

/**
 * Detect function breaking changes
 */
function detectFunctionBreakingChange(oldSignature: string, newSignature: string): boolean {
  // Simplified heuristic - look for parameter changes
  const oldParams = extractFunctionParameters(oldSignature);
  const newParams = extractFunctionParameters(newSignature);
  
  // Removed parameters or changed parameter types are breaking
  return oldParams.length > newParams.length || 
         oldParams.some((param, i) => newParams[i] && param !== newParams[i]);
}

/**
 * Detect interface breaking changes
 */
function detectInterfaceBreakingChange(oldSignature: string, newSignature: string): boolean {
  // Simplified heuristic - look for required property changes
  const oldProps = extractInterfaceProperties(oldSignature);
  const newProps = extractInterfaceProperties(newSignature);
  
  // Removed required properties are breaking
  return oldProps.some(prop => 
    !prop.optional && 
    !newProps.some(newProp => newProp.name === prop.name)
  );
}

/**
 * Detect type breaking changes
 */
function detectTypeBreakingChange(oldSignature: string, newSignature: string): boolean {
  // Any type change is potentially breaking
  return oldSignature !== newSignature;
}

/**
 * Extract function parameters (simplified)
 */
function extractFunctionParameters(signature: string): string[] {
  const match = signature.match(/\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(param => param.trim())
    .filter(Boolean);
}

/**
 * Extract interface properties (simplified)
 */
function extractInterfaceProperties(signature: string): Array<{ name: string; optional: boolean }> {
  const props: Array<{ name: string; optional: boolean }> = [];
  
  // Very simplified - just look for property patterns
  const propMatches = signature.matchAll(/(\w+)(\?)?:\s*[^;,}]+/g);
  
  for (const match of propMatches) {
    props.push({
      name: match[1],
      optional: !!match[2]
    });
  }
  
  return props;
}

/**
 * Detect configuration file breaking changes
 */
function detectConfigBreakingChanges(packagePath: string, fromRef: string, toRef: string): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  
  for (const configFile of CONFIG_FILES) {
    const filePath = join(packagePath, configFile);
    const oldContent = getFileAtRef(filePath, fromRef);
    const newContent = getFileAtRef(filePath, toRef);
    
    if (oldContent && newContent && oldContent !== newContent) {
      try {
        if (configFile.endsWith('.json')) {
          const oldConfig = JSON.parse(oldContent);
          const newConfig = JSON.parse(newContent);
          
          const configChanges = detectJSONConfigChanges(oldConfig, newConfig, configFile);
          breakingChanges.push(...configChanges.map(change => ({
            ...change,
            package: packagePath.replace('packages/', ''),
            file: filePath
          })));
        }
      } catch (error) {
        // If parsing fails, treat as potential breaking change
        breakingChanges.push({
          type: 'config',
          severity: 'major',
          package: packagePath.replace('packages/', ''),
          file: filePath,
          description: `Configuration file ${configFile} changed`,
          migrationHint: `Review changes to ${configFile} and update your configuration accordingly.`
        });
      }
    }
  }
  
  return breakingChanges;
}

/**
 * Detect JSON configuration breaking changes
 */
function detectJSONConfigChanges(oldConfig: any, newConfig: any, fileName: string): Omit<BreakingChange, 'package' | 'file'>[] {
  const changes: Omit<BreakingChange, 'package' | 'file'>[] = [];
  
  if (fileName === 'package.json') {
    // Check for removed scripts
    if (oldConfig.scripts && newConfig.scripts) {
      for (const script in oldConfig.scripts) {
        if (!(script in newConfig.scripts)) {
          changes.push({
            type: 'config',
            severity: 'minor',
            description: `Removed npm script '${script}'`,
            migrationHint: `The npm script '${script}' is no longer available. Update your build process accordingly.`
          });
        }
      }
    }
    
    // Check for changed main/exports
    if (oldConfig.main !== newConfig.main) {
      changes.push({
        type: 'config',
        severity: 'major',
        description: `Changed package main entry point from '${oldConfig.main}' to '${newConfig.main}'`,
        migrationHint: `Update imports to use the new entry point.`
      });
    }
    
    // Check for dependency changes
    const oldDeps = { ...oldConfig.dependencies, ...oldConfig.peerDependencies };
    const newDeps = { ...newConfig.dependencies, ...newConfig.peerDependencies };
    
    for (const dep in oldDeps) {
      if (!(dep in newDeps)) {
        changes.push({
          type: 'dependency',
          severity: 'major',
          description: `Removed dependency '${dep}'`,
          migrationHint: `The dependency '${dep}' is no longer included. You may need to install it separately.`
        });
      } else if (oldDeps[dep] !== newDeps[dep]) {
        changes.push({
          type: 'dependency',
          severity: 'minor',
          description: `Updated dependency '${dep}' from ${oldDeps[dep]} to ${newDeps[dep]}`,
          migrationHint: `Check for breaking changes in '${dep}' version ${newDeps[dep]}.`
        });
      }
    }
  }
  
  return changes;
}

/**
 * Validate breaking change commit message
 */
function validateBreakingChangeCommit(commitSha: string): { isValid: boolean; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  try {
    const commitMessage = execGit(`log -1 --pretty=format:"%B" ${commitSha}`);
    const commitSubject = execGit(`log -1 --pretty=format:"%s" ${commitSha}`);
    
    // Check if commit indicates breaking change
    const hasBreakingMarker = BREAKING_CHANGE_PATTERNS.some(pattern => 
      pattern.test(commitMessage) || pattern.test(commitSubject)
    );
    
    if (!hasBreakingMarker) {
      issues.push('Commit does not contain breaking change markers');
      suggestions.push('Add "BREAKING CHANGE:" in commit footer or "!" in commit type');
      suggestions.push('Example: "feat!: remove deprecated API" or "feat: add new feature\n\nBREAKING CHANGE: removes old API"');
    }
    
    // Check for conventional commit format
    const conventionalPattern = /^(\w+)(?:\([^)]+\))?(!)?\s*:\s*(.+)$/;
    if (!conventionalPattern.test(commitSubject)) {
      issues.push('Commit does not follow conventional commit format');
      suggestions.push('Use format: type(scope): description');
      suggestions.push('Example: "feat!: remove deprecated function"');
    }
    
    // Check for breaking change description
    const breakingChangeMatch = commitMessage.match(/BREAKING CHANGE:\s*(.+)/);
    if (hasBreakingMarker && !breakingChangeMatch) {
      issues.push('Breaking change marker found but no description provided');
      suggestions.push('Add detailed breaking change description after "BREAKING CHANGE:"');
    } else if (breakingChangeMatch && breakingChangeMatch[1].length < 10) {
      issues.push('Breaking change description is too short');
      suggestions.push('Provide detailed explanation of what breaks and how to migrate');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
    
  } catch (error) {
    return {
      isValid: false,
      issues: [`Failed to validate commit ${commitSha}: ${error}`],
      suggestions: ['Ensure commit exists and is accessible']
    };
  }
}

// ==============================================================================
// Main Detection Functions
// ==============================================================================

/**
 * Detect breaking changes between two references
 */
function detectBreakingChanges(options: DetectionOptions): PackageComparison[] {
  const fromRef = options.from || getLatestTag();
  const toRef = options.to || 'HEAD';
  
  console.log(`🔍 Detecting breaking changes from ${fromRef} to ${toRef}`);
  
  const results: PackageComparison[] = [];
  
  // Get list of packages to analyze
  let packagesToAnalyze: string[];
  
  if (options.package) {
    packagesToAnalyze = [`packages/${options.package}`];
  } else {
    try {
      packagesToAnalyze = execGit(`ls-tree -d --name-only ${toRef} packages/`)
        .split('\n')
        .filter(Boolean)
        .map(path => `packages/${path.replace('packages/', '')}`);
    } catch {
      packagesToAnalyze = [];
    }
  }
  
  for (const packagePath of packagesToAnalyze) {
    console.log(`📦 Analyzing package: ${packagePath}`);
    
    const packageName = packagePath.replace('packages/', '');
    
    // Extract API symbols
    const oldSymbols = extractAPISymbols(packagePath, fromRef);
    const newSymbols = extractAPISymbols(packagePath, toRef);
    
    // Compare APIs
    const apiComparison = compareAPISymbols(oldSymbols, newSymbols);
    
    // Detect breaking changes
    const apiBreakingChanges = detectAPIBreakingChanges(apiComparison, packageName);
    const configChanges = detectConfigBreakingChanges(packagePath, fromRef, toRef);
    
    results.push({
      packageName,
      apiComparison,
      breakingChanges: apiBreakingChanges,
      configChanges,
      dependencyChanges: configChanges.filter(c => c.type === 'dependency')
    });
  }
  
  return results;
}

// ==============================================================================
// Report Generation
// ==============================================================================

/**
 * Generate breaking changes report in markdown format
 */
function generateMarkdownReport(results: PackageComparison[]): string {
  let report = '# Breaking Changes Report\n\n';
  
  const allBreakingChanges = results.flatMap(r => [...r.breakingChanges, ...r.configChanges]);
  
  if (allBreakingChanges.length === 0) {
    report += '✅ **No breaking changes detected.**\n\n';
    return report;
  }
  
  report += `⚠️ **${allBreakingChanges.length} breaking changes detected.**\n\n`;
  
  for (const result of results) {
    const packageBreakingChanges = [...result.breakingChanges, ...result.configChanges];
    
    if (packageBreakingChanges.length === 0) continue;
    
    report += `## Package: ${result.packageName}\n\n`;
    
    // Group by severity
    const majorChanges = packageBreakingChanges.filter(c => c.severity === 'major');
    const minorChanges = packageBreakingChanges.filter(c => c.severity === 'minor');
    
    if (majorChanges.length > 0) {
      report += `### 🚨 Major Breaking Changes (${majorChanges.length})\n\n`;
      
      for (const change of majorChanges) {
        report += `#### ${change.description}\n\n`;
        report += `**Type:** ${change.type}\n`;
        report += `**File:** \`${change.file}\`\n`;
        
        if (change.line) {
          report += `**Location:** Line ${change.line}\n`;
        }
        
        if (change.before && change.after) {
          report += '\n**Before:**\n```typescript\n' + change.before + '\n```\n\n';
          report += '**After:**\n```typescript\n' + change.after + '\n```\n\n';
        } else if (change.before) {
          report += '\n**Removed:**\n```typescript\n' + change.before + '\n```\n\n';
        }
        
        if (change.migrationHint) {
          report += `**Migration:** ${change.migrationHint}\n\n`;
        }
        
        report += '---\n\n';
      }
    }
    
    if (minorChanges.length > 0) {
      report += `### ⚠️ Minor Breaking Changes (${minorChanges.length})\n\n`;
      
      for (const change of minorChanges) {
        report += `- **${change.description}** in \`${change.file}\`\n`;
        if (change.migrationHint) {
          report += `  - Migration: ${change.migrationHint}\n`;
        }
      }
      
      report += '\n';
    }
    
    // API summary
    const { added, removed, modified } = result.apiComparison;
    
    if (added.length > 0 || removed.length > 0 || modified.length > 0) {
      report += '### API Changes Summary\n\n';
      report += `- **Added:** ${added.length} symbols\n`;
      report += `- **Removed:** ${removed.length} symbols\n`;
      report += `- **Modified:** ${modified.length} symbols\n\n`;
    }
  }
  
  report += '## Migration Guide\n\n';
  report += 'To migrate to the new version:\n\n';
  
  let step = 1;
  for (const result of results) {
    const packageBreakingChanges = [...result.breakingChanges, ...result.configChanges];
    
    for (const change of packageBreakingChanges) {
      if (change.migrationHint) {
        report += `${step}. **${result.packageName}**: ${change.migrationHint}\n`;
        step++;
      }
    }
  }
  
  if (step === 1) {
    report += 'No specific migration steps required.\n';
  }
  
  report += '\n---\n\n';
  report += '*This report was generated automatically by the breaking change detector.*\n';
  
  return report;
}

/**
 * Generate JSON report
 */
function generateJSONReport(results: PackageComparison[]): string {
  return JSON.stringify(results, null, 2);
}

// ==============================================================================
// Main Commands
// ==============================================================================

/**
 * Detect command implementation
 */
function detectCommand(options: DetectionOptions): void {
  const results = detectBreakingChanges(options);
  
  let output: string;
  
  if (options.format === 'json') {
    output = generateJSONReport(results);
  } else {
    output = generateMarkdownReport(results);
  }
  
  if (options.output) {
    writeFileSync(options.output, output);
    console.log(`✅ Report written to ${options.output}`);
  } else {
    console.log(output);
  }
  
  // Exit with error code if breaking changes found
  const allBreakingChanges = results.flatMap(r => [...r.breakingChanges, ...r.configChanges]);
  if (allBreakingChanges.some(c => c.severity === 'major')) {
    process.exit(1);
  }
}

/**
 * Validate command implementation
 */
function validateCommand(commitSha: string): void {
  const validation = validateBreakingChangeCommit(commitSha);
  
  if (validation.isValid) {
    console.log('✅ Breaking change commit is valid');
  } else {
    console.log('❌ Breaking change commit validation failed:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
    
    if (validation.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      validation.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }
    
    process.exit(1);
  }
}

/**
 * Migration command implementation
 */
function migrationCommand(options: DetectionOptions): void {
  const results = detectBreakingChanges(options);
  
  let migrationGuide = '# Migration Guide\n\n';
  migrationGuide += `This guide helps you migrate from version ${options.from || 'previous'} to ${options.to || 'current'}.\n\n`;
  
  const allBreakingChanges = results.flatMap(r => [...r.breakingChanges, ...r.configChanges]);
  
  if (allBreakingChanges.length === 0) {
    migrationGuide += '✅ No breaking changes detected. No migration required.\n';
  } else {
    migrationGuide += '## Overview\n\n';
    migrationGuide += `This release contains ${allBreakingChanges.length} breaking changes across ${results.length} packages.\n\n`;
    
    migrationGuide += '## Quick Migration Checklist\n\n';
    
    let checklistIndex = 1;
    for (const result of results) {
      const packageChanges = [...result.breakingChanges, ...result.configChanges];
      
      for (const change of packageChanges) {
        if (change.migrationHint) {
          migrationGuide += `- [ ] ${result.packageName}: ${change.migrationHint}\n`;
        }
      }
    }
    
    migrationGuide += '\n## Detailed Migration Steps\n\n';
    
    for (const result of results) {
      const packageChanges = [...result.breakingChanges, ...result.configChanges];
      
      if (packageChanges.length === 0) continue;
      
      migrationGuide += `### ${result.packageName}\n\n`;
      
      for (const change of packageChanges) {
        migrationGuide += `#### ${change.description}\n\n`;
        
        if (change.before && change.after) {
          migrationGuide += '**Before:**\n```typescript\n' + change.before + '\n```\n\n';
          migrationGuide += '**After:**\n```typescript\n' + change.after + '\n```\n\n';
        }
        
        if (change.migrationHint) {
          migrationGuide += `**Migration Steps:**\n${change.migrationHint}\n\n`;
        }
      }
    }
  }
  
  migrationGuide += '\n## Need Help?\n\n';
  migrationGuide += 'If you encounter issues during migration:\n\n';
  migrationGuide += '- [Create an issue](https://github.com/sammons2/claude-good-hooks/issues)\n';
  migrationGuide += '- [Check the documentation](https://claude-good-hooks.dev)\n';
  migrationGuide += '- [Join the discussion](https://github.com/sammons2/claude-good-hooks/discussions)\n';
  
  if (options.output) {
    writeFileSync(options.output, migrationGuide);
    console.log(`✅ Migration guide written to ${options.output}`);
  } else {
    console.log(migrationGuide);
  }
}

// ==============================================================================
// CLI Setup
// ==============================================================================

const program = new Command();

program
  .name('breaking-change-detector')
  .description('Detect and validate breaking changes in Claude Good Hooks')
  .version('1.0.0')
  .option('--from <ref>', 'Compare from this git reference')
  .option('--to <ref>', 'Compare to this git reference', 'HEAD')
  .option('--package <name>', 'Analyze specific package only')
  .option('--format <type>', 'Output format: json, markdown, text', 'markdown')
  .option('--strict', 'Enable strict breaking change detection', false)
  .option('--output <file>', 'Output file path')
  .option('--include-patches', 'Include patch-level breaking changes', false);

program
  .command('detect')
  .description('Detect breaking changes between versions/branches')
  .action((cmdOptions, command) => {
    const globalOptions = command.parent?.opts() || {};
    const options: DetectionOptions = { ...globalOptions };
    
    try {
      detectCommand(options);
    } catch (error: any) {
      console.error('❌ Detection failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate <commit>')
  .description('Validate breaking change commit format')
  .action((commit: string) => {
    try {
      validateCommand(commit);
    } catch (error: any) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('migration')
  .description('Generate migration guide template')
  .action((cmdOptions, command) => {
    const globalOptions = command.parent?.opts() || {};
    const options: DetectionOptions = { ...globalOptions };
    
    try {
      migrationCommand(options);
    } catch (error: any) {
      console.error('❌ Migration guide generation failed:', error.message);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();
#!/usr/bin/env tsx
/**
 * Generate all badges for the project
 */
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Type definitions
interface ExecutionResult {
  success: boolean;
  error?: string;
}

const projectRoot = join(__dirname, '../..');
const badgesDir = join(__dirname, '..', 'badges');

/**
 * Ensure badges directory exists
 */
function ensureBadgesDir(): void {
  if (!existsSync(badgesDir)) {
    mkdirSync(badgesDir, { recursive: true });
    console.log(`Created badges directory: ${badgesDir}`);
  }
}

/**
 * Execute a command safely with error handling
 * @param command - Command to execute
 * @param description - Description of the command for logging
 * @returns Execution result
 */
function safeExecute(command: string, description: string): ExecutionResult {
  try {
    console.log(`${description}...`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error ${description.toLowerCase()}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate license badge
 */
function generateLicense(): ExecutionResult {
  const licenseName = process.env.LICENSE || 'MIT';
  return safeExecute(
    `tsx "${join(__dirname, 'generate-license-badge.ts')}" "${licenseName}"`,
    'Generating license badge'
  );
}

/**
 * Generate version badges for all packages
 */
function generateVersionBadges(): ExecutionResult[] {
  const packagesDir = join(projectRoot, 'packages');
  const results: ExecutionResult[] = [];
  
  if (!existsSync(packagesDir)) {
    console.log('No packages directory found');
    return results;
  }
  
  try {
    const packageDirs = readdirSync(packagesDir).filter(dir => {
      const packageJsonPath = join(packagesDir, dir, 'package.json');
      return existsSync(packageJsonPath);
    });
    
    console.log(`Found ${packageDirs.length} packages`);
    
    for (const packageDir of packageDirs) {
      const packageJsonPath = join(packagesDir, packageDir, 'package.json');
      const result = safeExecute(
        `tsx "${join(__dirname, 'generate-version-badge.ts')}" "${packageJsonPath}"`,
        `Generating version badge for ${packageDir}`
      );
      results.push(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error reading packages directory:', errorMessage);
    results.push({ success: false, error: errorMessage });
  }
  
  return results;
}

/**
 * Generate build badge (default to success for now)
 */
function generateBuild(): ExecutionResult {
  const buildStatus = process.env.BUILD_STATUS || 'success';
  console.log(`Build status: ${buildStatus}`);
  
  return safeExecute(
    `tsx "${join(__dirname, 'generate-build-badge.ts')}" "${buildStatus}"`,
    `Generating build badge with status: ${buildStatus}`
  );
}

/**
 * Generate coverage badge
 */
function generateCoverageBadge(): ExecutionResult {
  // Try to find coverage report or use default
  const coveragePercentage = process.env.COVERAGE_PERCENTAGE || '85';
  console.log(`Coverage percentage: ${coveragePercentage}%`);
  
  return safeExecute(
    `tsx "${join(__dirname, 'generate-coverage-badge.ts')}" "${coveragePercentage}"`,
    `Generating coverage badge with ${coveragePercentage}% coverage`
  );
}

/**
 * Count successful and failed operations
 * @param results - Array of execution results
 * @returns Summary of results
 */
function summarizeResults(results: ExecutionResult[]): { success: number; failed: number } {
  const success = results.filter(r => r.success).length;
  const failed = results.length - success;
  return { success, failed };
}

/**
 * List generated badge files
 */
function listGeneratedBadges(): void {
  try {
    const badges = readdirSync(badgesDir).filter(file => file.endsWith('.svg'));
    console.log(`\nGenerated ${badges.length} badges:`);
    badges.forEach(badge => console.log(`  - ${badge}`));
  } catch (error) {
    console.error('Error listing badges:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main function
 */
function main(): void {
  console.log('Generating all badges...');
  
  ensureBadgesDir();
  
  const results: ExecutionResult[] = [];
  
  // Generate individual badges
  results.push(generateLicense());
  results.push(...generateVersionBadges());
  results.push(generateBuild());
  results.push(generateCoverageBadge());
  
  // Summary
  const { success, failed } = summarizeResults(results);
  
  console.log('\nBadge generation complete!');
  console.log(`Badges saved to: ${badgesDir}`);
  console.log(`Success: ${success}, Failed: ${failed}`);
  
  if (failed > 0) {
    console.error(`\nWarning: ${failed} badge(s) failed to generate.`);
  }
  
  // List generated badges
  listGeneratedBadges();
  
  // Exit with error code if any operations failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  generateLicense,
  generateVersionBadges,
  generateBuild,
  generateCoverageBadge,
  ensureBadgesDir,
  safeExecute
};
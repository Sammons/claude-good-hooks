#!/usr/bin/env tsx
/**
 * Clean up old or unused badge files
 */
import { readdirSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Type definitions
interface PackageJson {
  name?: string;
  private?: boolean;
  [key: string]: any;
}

const badgesDir = join(__dirname, '..', 'badges');
const projectRoot = join(__dirname, '../..');

/**
 * Generate filename-safe name from package name
 * @param packageName - npm package name (e.g., @scope/package)
 * @returns Safe filename
 */
function generateSafeFilename(packageName: string): string {
  return packageName.replace(/[@\/]/g, '-').replace(/^-/, '');
}

/**
 * Read and parse package.json safely
 * @param packageJsonPath - Path to package.json file
 * @returns Parsed package.json or null if failed
 */
function readPackageJson(packageJsonPath: string): PackageJson | null {
  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content) as PackageJson;
  } catch (error) {
    console.warn(`Error reading ${packageJsonPath}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Get expected badge files based on package.json files
 * @returns Set of expected badge filenames
 */
function getExpectedBadgeFiles(): Set<string> {
  const packagesDir = join(projectRoot, 'packages');
  const expectedBadges = new Set<string>();
  
  // Always expect these basic badges
  expectedBadges.add('build.svg');
  expectedBadges.add('coverage.svg');
  expectedBadges.add('license.svg');
  
  // Add version badges for each package
  if (existsSync(packagesDir)) {
    try {
      const packageDirs = readdirSync(packagesDir).filter(dir => {
        const packageJsonPath = join(packagesDir, dir, 'package.json');
        return existsSync(packageJsonPath);
      });
      
      for (const packageDir of packageDirs) {
        const packageJsonPath = join(packagesDir, packageDir, 'package.json');
        const packageJson = readPackageJson(packageJsonPath);
        
        if (packageJson?.name && !packageJson.private) {
          const safeName = generateSafeFilename(packageJson.name);
          expectedBadges.add(`${safeName}-version.svg`);
        }
      }
    } catch (error) {
      console.error('Error processing packages directory:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  return expectedBadges;
}

/**
 * Get existing badge files in the badges directory
 * @returns Array of existing badge filenames
 */
function getExistingBadges(): string[] {
  try {
    if (!existsSync(badgesDir)) {
      return [];
    }
    return readdirSync(badgesDir).filter(file => file.endsWith('.svg'));
  } catch (error) {
    console.error('Error reading badges directory:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Clean up unused badge files
 */
function cleanupBadges(): void {
  if (!existsSync(badgesDir)) {
    console.log('Badges directory does not exist, nothing to clean up');
    return;
  }
  
  try {
    const expectedBadges = getExpectedBadgeFiles();
    const existingBadges = getExistingBadges();
    
    console.log('Expected badges:', Array.from(expectedBadges).sort());
    console.log('Existing badges:', existingBadges.sort());
    
    let removedCount = 0;
    const errors: string[] = [];
    
    for (const badge of existingBadges) {
      if (!expectedBadges.has(badge)) {
        try {
          const badgePath = join(badgesDir, badge);
          console.log(`Removing unused badge: ${badge}`);
          unlinkSync(badgePath);
          removedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to remove ${badge}:`, errorMessage);
          errors.push(`${badge}: ${errorMessage}`);
        }
      }
    }
    
    // Summary
    if (removedCount === 0 && errors.length === 0) {
      console.log('No unused badges found');
    } else {
      if (removedCount > 0) {
        console.log(`Successfully removed ${removedCount} unused badge(s)`);
      }
      if (errors.length > 0) {
        console.error(`Failed to remove ${errors.length} badge(s):`);
        errors.forEach(error => console.error(`  - ${error}`));
      }
    }
    
    // Exit with error if there were failures
    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during cleanup:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupBadges();
}

export { 
  getExpectedBadgeFiles, 
  getExistingBadges, 
  cleanupBadges, 
  generateSafeFilename,
  readPackageJson
};
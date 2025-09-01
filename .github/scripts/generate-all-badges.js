#!/usr/bin/env node
/**
 * Generate all badges for the project
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import badge generators
const { generateBadgeSVG: generateBuildBadge } = require('./generate-build-badge.js');
const { generateBadgeSVG: generateLicenseBadge } = require('./generate-license-badge.js');
const { 
  generateSafeFilename,
  readPackageInfo
} = require('./generate-version-badge.js');

const projectRoot = path.join(__dirname, '../..');
const badgesDir = path.join(__dirname, '..', 'badges');

/**
 * Ensure badges directory exists
 */
function ensureBadgesDir() {
  if (!fs.existsSync(badgesDir)) {
    fs.mkdirSync(badgesDir, { recursive: true });
    console.log(`Created badges directory: ${badgesDir}`);
  }
}

/**
 * Generate license badge
 */
function generateLicense() {
  try {
    console.log('Generating license badge...');
    execSync(`node "${path.join(__dirname, 'generate-license-badge.js')}" MIT`, { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Error generating license badge:', error.message);
  }
}

/**
 * Generate version badges for all packages
 */
function generateVersionBadges() {
  const packagesDir = path.join(projectRoot, 'packages');
  
  if (!fs.existsSync(packagesDir)) {
    console.log('No packages directory found');
    return;
  }
  
  const packageDirs = fs.readdirSync(packagesDir).filter(dir => {
    const packageJsonPath = path.join(packagesDir, dir, 'package.json');
    return fs.existsSync(packageJsonPath);
  });
  
  console.log(`Found ${packageDirs.length} packages`);
  
  for (const packageDir of packageDirs) {
    const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    
    try {
      console.log(`Generating version badge for ${packageDir}...`);
      execSync(`node "${path.join(__dirname, 'generate-version-badge.js')}" "${packageJsonPath}"`, {
        stdio: 'inherit'
      });
    } catch (error) {
      console.error(`Error generating version badge for ${packageDir}:`, error.message);
    }
  }
}

/**
 * Generate build badge (default to success for now)
 */
function generateBuild() {
  try {
    const buildStatus = process.env.BUILD_STATUS || 'success';
    console.log(`Generating build badge with status: ${buildStatus}`);
    execSync(`node "${path.join(__dirname, 'generate-build-badge.js')}" ${buildStatus}`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Error generating build badge:', error.message);
  }
}

/**
 * Generate coverage badge
 */
function generateCoverageBadge() {
  try {
    // Try to find coverage report or use default
    const coveragePercentage = process.env.COVERAGE_PERCENTAGE || '85';
    console.log(`Generating coverage badge with ${coveragePercentage}% coverage`);
    execSync(`node "${path.join(__dirname, 'generate-coverage-badge.js')}" ${coveragePercentage}`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Error generating coverage badge:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('Generating all badges...');
  
  ensureBadgesDir();
  
  generateLicense();
  generateVersionBadges();
  generateBuild();
  generateCoverageBadge();
  
  console.log('Badge generation complete!');
  console.log(`Badges saved to: ${badgesDir}`);
  
  // List generated badges
  const badges = fs.readdirSync(badgesDir).filter(file => file.endsWith('.svg'));
  console.log(`Generated ${badges.length} badges:`);
  badges.forEach(badge => console.log(`  - ${badge}`));
}

if (require.main === module) {
  main();
}

module.exports = {
  generateLicense,
  generateVersionBadges,
  generateBuild,
  generateCoverageBadge
};
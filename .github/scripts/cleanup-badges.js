#!/usr/bin/env node
/**
 * Clean up old or unused badge files
 */
const fs = require('fs');
const path = require('path');

const badgesDir = path.join(__dirname, '..', 'badges');

/**
 * Get expected badge files based on package.json files
 */
function getExpectedBadgeFiles() {
  const projectRoot = path.join(__dirname, '../..');
  const packagesDir = path.join(projectRoot, 'packages');
  const expectedBadges = new Set();
  
  // Always expect these basic badges
  expectedBadges.add('build.svg');
  expectedBadges.add('coverage.svg');
  expectedBadges.add('license.svg');
  
  // Add version badges for each package
  if (fs.existsSync(packagesDir)) {
    const packageDirs = fs.readdirSync(packagesDir).filter(dir => {
      const packageJsonPath = path.join(packagesDir, dir, 'package.json');
      return fs.existsSync(packageJsonPath);
    });
    
    for (const packageDir of packageDirs) {
      const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name && !packageJson.private) {
          const safeName = packageJson.name.replace(/[@\/]/g, '-').replace(/^-/, '');
          expectedBadges.add(`${safeName}-version.svg`);
        }
      } catch (error) {
        console.warn(`Error reading ${packageJsonPath}:`, error.message);
      }
    }
  }
  
  return expectedBadges;
}

/**
 * Clean up unused badge files
 */
function cleanupBadges() {
  if (!fs.existsSync(badgesDir)) {
    console.log('Badges directory does not exist, nothing to clean up');
    return;
  }
  
  const expectedBadges = getExpectedBadgeFiles();
  const existingBadges = fs.readdirSync(badgesDir).filter(file => file.endsWith('.svg'));
  
  console.log('Expected badges:', Array.from(expectedBadges).sort());
  console.log('Existing badges:', existingBadges.sort());
  
  let removedCount = 0;
  
  for (const badge of existingBadges) {
    if (!expectedBadges.has(badge)) {
      const badgePath = path.join(badgesDir, badge);
      console.log(`Removing unused badge: ${badge}`);
      fs.unlinkSync(badgePath);
      removedCount++;
    }
  }
  
  if (removedCount === 0) {
    console.log('No unused badges found');
  } else {
    console.log(`Removed ${removedCount} unused badge(s)`);
  }
}

if (require.main === module) {
  cleanupBadges();
}

module.exports = { getExpectedBadgeFiles, cleanupBadges };
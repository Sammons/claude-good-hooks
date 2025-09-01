#!/usr/bin/env node
/**
 * Generate npm version badge SVG for packages
 */
const fs = require('fs');
const path = require('path');

/**
 * Generate SVG badge
 * @param {string} label - Left side text
 * @param {string} message - Right side text  
 * @param {string} color - Badge color
 * @returns {string} SVG content
 */
function generateBadgeSVG(label, message, color) {
  // Calculate text widths (approximation)
  const labelWidth = label.length * 6 + 10;
  const messageWidth = message.length * 6 + 10;
  const totalWidth = labelWidth + messageWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth/2 * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth-10) * 10}">${label}</text>
    <text x="${labelWidth/2 * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth-10) * 10}">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + messageWidth/2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(messageWidth-10) * 10}">${message}</text>
    <text x="${(labelWidth + messageWidth/2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(messageWidth-10) * 10}">${message}</text>
  </g>
</svg>`;
}

/**
 * Read package.json and extract version
 * @param {string} packagePath - Path to package.json
 * @returns {object|null} Package info or null if not found
 */
function readPackageInfo(packagePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version
    };
  } catch (error) {
    console.error(`Error reading package.json at ${packagePath}:`, error.message);
    return null;
  }
}

/**
 * Generate filename-safe name from package name
 * @param {string} packageName - npm package name (e.g., @scope/package)
 * @returns {string} Safe filename
 */
function generateSafeFilename(packageName) {
  return packageName.replace(/[@\/]/g, '-').replace(/^-/, '');
}

/**
 * Main function
 */
function main() {
  const packagePath = process.argv[2];
  const outputDir = process.argv[3] || path.join(__dirname, '..', 'badges');
  
  if (!packagePath) {
    console.error('Usage: generate-version-badge.js <package.json-path> [output-dir]');
    process.exit(1);
  }

  const packageInfo = readPackageInfo(packagePath);
  if (!packageInfo) {
    process.exit(1);
  }

  const { name, version } = packageInfo;
  const safeFileName = generateSafeFilename(name);
  const outputPath = path.join(outputDir, `${safeFileName}-version.svg`);
  
  // Use npm brand color
  const color = '#cb3837';
  const svg = generateBadgeSVG('npm', `v${version}`, color);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Version badge generated for ${name}: ${outputPath} (v${version})`);
}

if (require.main === module) {
  main();
}

module.exports = { generateBadgeSVG, readPackageInfo, generateSafeFilename };
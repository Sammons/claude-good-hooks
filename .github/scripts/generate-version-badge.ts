#!/usr/bin/env tsx
/**
 * Generate npm version badge SVG for packages
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
interface PackageInfo {
  name: string;
  version: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Generate SVG badge
 * @param label - Left side text
 * @param message - Right side text  
 * @param color - Badge color
 * @returns SVG content
 */
function generateBadgeSVG(label: string, message: string, color: string): string {
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
 * Read package.json and extract version information
 * @param packagePath - Path to package.json
 * @returns Package info or null if not found
 */
function readPackageInfo(packagePath: string): PackageInfo | null {
  try {
    if (!existsSync(packagePath)) {
      throw new Error(`Package file does not exist: ${packagePath}`);
    }

    const packageContent = readFileSync(packagePath, 'utf8');
    const packageJson: PackageJson = JSON.parse(packageContent);
    
    if (!packageJson.name || !packageJson.version) {
      throw new Error('Package.json missing required name or version field');
    }

    return {
      name: packageJson.name,
      version: packageJson.version
    };
  } catch (error) {
    console.error(`Error reading package.json at ${packagePath}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Generate filename-safe name from package name
 * @param packageName - npm package name (e.g., @scope/package)
 * @returns Safe filename
 */
function generateSafeFilename(packageName: string): string {
  if (!packageName || typeof packageName !== 'string') {
    throw new Error('Package name must be a non-empty string');
  }
  
  return packageName.replace(/[@\/]/g, '-').replace(/^-/, '');
}

/**
 * Ensure directory exists
 * @param dirPath - Path to directory
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Main function
 */
function main(): void {
  try {
    const packagePath = process.argv[2];
    const outputDir = process.argv[3] || join(__dirname, '..', 'badges');
    
    if (!packagePath) {
      console.error('Usage: generate-version-badge.ts <package.json-path> [output-dir]');
      process.exit(1);
    }

    const packageInfo = readPackageInfo(packagePath);
    if (!packageInfo) {
      process.exit(1);
    }

    const { name, version } = packageInfo;
    const safeFileName = generateSafeFilename(name);
    const outputPath = join(outputDir, `${safeFileName}-version.svg`);
    
    // Use npm brand color
    const color = '#cb3837';
    const svg = generateBadgeSVG('npm', `v${version}`, color);
    
    // Ensure output directory exists
    ensureDirectoryExists(outputDir);
    
    writeFileSync(outputPath, svg, 'utf8');
    console.log(`Version badge generated for ${name}: ${outputPath} (v${version})`);
  } catch (error) {
    console.error('Error generating version badge:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateBadgeSVG, readPackageInfo, generateSafeFilename };
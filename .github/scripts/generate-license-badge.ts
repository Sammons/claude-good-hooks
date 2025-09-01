#!/usr/bin/env tsx
/**
 * Generate license badge SVG
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Validate license string
 * @param license - License string to validate
 * @returns Sanitized license string
 */
function validateLicense(license: string): string {
  if (!license || typeof license !== 'string') {
    return 'MIT';
  }
  
  // Basic sanitization - remove any potentially dangerous characters
  const sanitized = license.trim().replace(/[<>&"']/g, '');
  return sanitized || 'MIT';
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
    const license = validateLicense(process.argv[2] || 'MIT');
    const outputPath = process.argv[3] || join(__dirname, '..', 'badges', 'license.svg');
    
    // Use yellow color for MIT license (matching shields.io style)
    const color = '#dfb317';
    const svg = generateBadgeSVG('License', license, color);
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    ensureDirectoryExists(outputDir);
    
    writeFileSync(outputPath, svg, 'utf8');
    console.log(`License badge generated: ${outputPath} (${license})`);
  } catch (error) {
    console.error('Error generating license badge:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateBadgeSVG, validateLicense };
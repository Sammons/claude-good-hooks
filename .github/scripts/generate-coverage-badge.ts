#!/usr/bin/env tsx
/**
 * Generate test coverage badge SVG
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
interface CoverageColors {
  [threshold: number]: string;
}

interface CoverageReport {
  total?: {
    lines?: { pct: number };
    statements?: { pct: number };
    functions?: { pct: number };
    branches?: { pct: number };
  };
  coverage?: {
    statements?: { pct: number };
    lines?: { pct: number };
    functions?: { pct: number };
    branches?: { pct: number };
  };
  [key: string]: any;
}

// Colors for different coverage levels
const COVERAGE_COLORS: CoverageColors = {
  90: '#4c1',   // bright green
  80: '#97ca00', // green
  70: '#a4a61d', // yellow-green
  60: '#dfb317', // yellow
  50: '#fe7d37', // orange
  0: '#e05d44'   // red
};

/**
 * Get color based on coverage percentage
 * @param percentage - Coverage percentage
 * @returns Color code
 */
function getCoverageColor(percentage: number): string {
  const thresholds = [90, 80, 70, 60, 50, 0];
  for (const threshold of thresholds) {
    if (percentage >= threshold) {
      return COVERAGE_COLORS[threshold];
    }
  }
  return COVERAGE_COLORS[0];
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
 * Parse coverage from coverage report file
 * @param coverageFile - Path to coverage report (JSON format)
 * @returns Coverage percentage or null if not found
 */
function parseCoverageFromFile(coverageFile: string): number | null {
  try {
    if (!existsSync(coverageFile)) {
      throw new Error(`Coverage file does not exist: ${coverageFile}`);
    }

    const coverageContent = readFileSync(coverageFile, 'utf8');
    const coverage: CoverageReport = JSON.parse(coverageContent);
    
    // Try different coverage report formats
    if (coverage.total?.lines?.pct !== undefined) {
      return coverage.total.lines.pct;
    }
    
    if (coverage.total?.statements?.pct !== undefined) {
      return coverage.total.statements.pct;
    }
    
    if (coverage.coverage?.statements?.pct !== undefined) {
      return coverage.coverage.statements.pct;
    }
    
    if (coverage.coverage?.lines?.pct !== undefined) {
      return coverage.coverage.lines.pct;
    }
    
    // Add more format parsers as needed
    console.warn('Unknown coverage report format. Please check the file structure.');
    return null;
  } catch (error) {
    console.error(`Error parsing coverage file ${coverageFile}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Validate and parse percentage input
 * @param input - String input that should be a percentage
 * @returns Parsed percentage or null if invalid
 */
function parsePercentage(input: string): number | null {
  const percentage = parseFloat(input);
  if (isNaN(percentage)) {
    return null;
  }
  // Ensure percentage is within valid range
  return Math.max(0, Math.min(100, percentage));
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
    const coverageInput = process.argv[2]; // Can be percentage or file path
    const outputPath = process.argv[3] || join(__dirname, '..', 'badges', 'coverage.svg');
    
    let percentage: number;
    
    if (!coverageInput) {
      console.error('Usage: generate-coverage-badge.ts <percentage|coverage-file> [output-path]');
      process.exit(1);
    }
    
    // Check if input is a file path or percentage
    if (existsSync(coverageInput)) {
      const parsedPercentage = parseCoverageFromFile(coverageInput);
      if (parsedPercentage === null) {
        process.exit(1);
      }
      percentage = parsedPercentage;
    } else {
      const parsedPercentage = parsePercentage(coverageInput);
      if (parsedPercentage === null) {
        console.error('Invalid percentage value');
        process.exit(1);
      }
      percentage = parsedPercentage;
    }
    
    const color = getCoverageColor(percentage);
    const message = `${percentage.toFixed(1)}%`;
    const svg = generateBadgeSVG('coverage', message, color);
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    ensureDirectoryExists(outputDir);
    
    writeFileSync(outputPath, svg, 'utf8');
    console.log(`Coverage badge generated: ${outputPath} (${message})`);
  } catch (error) {
    console.error('Error generating coverage badge:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateBadgeSVG, getCoverageColor, parseCoverageFromFile, parsePercentage };
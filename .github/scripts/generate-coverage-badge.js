#!/usr/bin/env node
/**
 * Generate test coverage badge SVG
 */
const fs = require('fs');
const path = require('path');

// Colors for different coverage levels
const COVERAGE_COLORS = {
  90: '#4c1',   // bright green
  80: '#97ca00', // green
  70: '#a4a61d', // yellow-green
  60: '#dfb317', // yellow
  50: '#fe7d37', // orange
  0: '#e05d44'   // red
};

/**
 * Get color based on coverage percentage
 * @param {number} percentage - Coverage percentage
 * @returns {string} Color code
 */
function getCoverageColor(percentage) {
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
 * Parse coverage from coverage report file
 * @param {string} coverageFile - Path to coverage report (JSON format)
 * @returns {number|null} Coverage percentage or null if not found
 */
function parseCoverageFromFile(coverageFile) {
  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    // Try different coverage report formats
    if (coverage.total && coverage.total.lines) {
      return coverage.total.lines.pct;
    }
    
    if (coverage.coverage && coverage.coverage.statements) {
      return coverage.coverage.statements.pct;
    }
    
    // Add more format parsers as needed
    console.warn('Unknown coverage report format');
    return null;
  } catch (error) {
    console.error(`Error parsing coverage file ${coverageFile}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
function main() {
  const coverageInput = process.argv[2]; // Can be percentage or file path
  const outputPath = process.argv[3] || path.join(__dirname, '..', 'badges', 'coverage.svg');
  
  let percentage;
  
  if (!coverageInput) {
    console.error('Usage: generate-coverage-badge.js <percentage|coverage-file> [output-path]');
    process.exit(1);
  }
  
  // Check if input is a file path or percentage
  if (fs.existsSync(coverageInput)) {
    percentage = parseCoverageFromFile(coverageInput);
    if (percentage === null) {
      process.exit(1);
    }
  } else {
    percentage = parseFloat(coverageInput);
    if (isNaN(percentage)) {
      console.error('Invalid percentage value');
      process.exit(1);
    }
  }
  
  // Ensure percentage is within valid range
  percentage = Math.max(0, Math.min(100, percentage));
  
  const color = getCoverageColor(percentage);
  const message = `${percentage.toFixed(1)}%`;
  const svg = generateBadgeSVG('coverage', message, color);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Coverage badge generated: ${outputPath} (${message})`);
}

if (require.main === module) {
  main();
}

module.exports = { generateBadgeSVG, getCoverageColor, parseCoverageFromFile };
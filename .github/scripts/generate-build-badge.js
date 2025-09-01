#!/usr/bin/env node
/**
 * Generate build status badge SVG based on GitHub Actions workflow status
 */
const fs = require('fs');
const path = require('path');

// Colors for different statuses
const COLORS = {
  success: '#4c1',
  failure: '#e05d44',
  pending: '#dfb317',
  unknown: '#9f9f9f'
};

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
 * Main function
 */
function main() {
  const status = process.argv[2] || 'unknown';
  const outputPath = process.argv[3] || path.join(__dirname, '..', 'badges', 'build.svg');
  
  const statusMessages = {
    success: 'passing',
    failure: 'failing', 
    pending: 'pending',
    unknown: 'unknown'
  };

  const message = statusMessages[status] || 'unknown';
  const color = COLORS[status] || COLORS.unknown;
  
  const svg = generateBadgeSVG('build', message, color);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Build badge generated: ${outputPath} (status: ${status})`);
}

if (require.main === module) {
  main();
}

module.exports = { generateBadgeSVG };
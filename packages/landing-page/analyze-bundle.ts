#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

interface FileResult {
  file: string;
  size: number;
  gzipSize: number;
  type: string;
}

interface Budget {
  budget: number;
  current: number;
}

async function analyzeBundleSize(): Promise<{
  totalSize: number;
  totalGzipSize: number;
  results: FileResult[];
  budgets: Record<string, Budget>;
  recommendations: string[];
} | void> {
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');

  console.log('📦 Bundle Size Analysis');
  console.log('='.repeat(50));

  if (!fs.existsSync(assetsPath)) {
    console.log('❌ No build found. Run `npm run build` first.');
    return;
  }

  const files = fs.readdirSync(assetsPath);
  let totalSize = 0;
  let totalGzipSize = 0;

  const results: FileResult[] = [];

  for (const file of files) {
    if (file.endsWith('.map')) continue;

    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const gzipContent = await gzipAsync(content);

    const size = stats.size;
    const gzipSize = gzipContent.length;

    totalSize += size;
    totalGzipSize += gzipSize;

    results.push({
      file,
      size,
      gzipSize,
      type: getFileType(file),
    });
  }

  // Sort by size descending
  results.sort((a, b) => b.size - a.size);

  console.log('\n📊 File Breakdown:');
  console.log('-'.repeat(80));
  console.log('File'.padEnd(30) + 'Size'.padEnd(12) + 'Gzipped'.padEnd(12) + 'Type');
  console.log('-'.repeat(80));

  results.forEach(({ file, size, gzipSize, type }) => {
    const shortName = file.length > 28 ? file.substring(0, 25) + '...' : file;
    console.log(
      shortName.padEnd(30) + formatSize(size).padEnd(12) + formatSize(gzipSize).padEnd(12) + type
    );
  });

  console.log('-'.repeat(80));
  console.log(
    'TOTAL'.padEnd(30) +
      formatSize(totalSize).padEnd(12) +
      formatSize(totalGzipSize).padEnd(12) +
      'All Files'
  );

  console.log('\n🎯 Size Budget Analysis:');
  console.log('-'.repeat(50));

  // Define budgets
  const budgets: Record<string, Budget> = {
    JavaScript: {
      budget: 50000,
      current: results.filter(f => f.type === 'JavaScript').reduce((sum, f) => sum + f.gzipSize, 0),
    },
    CSS: {
      budget: 10000,
      current: results.filter(f => f.type === 'CSS').reduce((sum, f) => sum + f.gzipSize, 0),
    },
    Total: { budget: 100000, current: totalGzipSize },
  };

  Object.entries(budgets).forEach(([category, { budget, current }]) => {
    const percentage = ((current / budget) * 100).toFixed(1);
    const status = current <= budget ? '✅' : '❌';
    const indicator = getProgressBar(current / budget);

    console.log(`${status} ${category}`);
    console.log(`   ${formatSize(current)} / ${formatSize(budget)} (${percentage}%)`);
    console.log(`   ${indicator}`);
    console.log('');
  });

  console.log('\n💡 Recommendations:');
  console.log('-'.repeat(50));

  const recommendations: string[] = [];

  if (budgets.JavaScript.current > budgets.JavaScript.budget * 0.8) {
    recommendations.push('Consider code splitting for JavaScript bundles');
  }

  if (budgets.CSS.current > budgets.CSS.budget * 0.8) {
    recommendations.push('Consider CSS optimization or critical path extraction');
  }

  // Check for large individual files
  results.forEach(({ file, gzipSize, type }) => {
    if (type === 'JavaScript' && gzipSize > 15000) {
      recommendations.push(`Large JavaScript file detected: ${file} (${formatSize(gzipSize)})`);
    }
    if (type === 'CSS' && gzipSize > 8000) {
      recommendations.push(`Large CSS file detected: ${file} (${formatSize(gzipSize)})`);
    }
  });

  if (recommendations.length === 0) {
    console.log('✅ Bundle sizes look good! No immediate optimizations needed.');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  // Check for external dependencies
  console.log('\n🌐 External Dependencies Analysis:');
  console.log('-'.repeat(50));

  const htmlPath = path.join(distPath, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const externalScripts = htmlContent.match(/<script[^>]*src="https?:\/\/[^"]*"/g) || [];
    const externalStyles = htmlContent.match(/<link[^>]*href="https?:\/\/[^"]*"/g) || [];

    const externals = [...externalScripts, ...externalStyles];

    if (externals.length > 0) {
      console.log('External resources found:');
      externals.forEach(ext => {
        const url = ext.match(/(?:src|href)="([^"]*)"/) || [];
        if (url[1]) {
          console.log(`  • ${url[1]}`);
        }
      });
      console.log('\n💡 Consider bundling critical external resources for better performance.');
    } else {
      console.log('✅ No external dependencies found in HTML.');
    }
  }

  return {
    totalSize,
    totalGzipSize,
    results,
    budgets,
    recommendations,
  };
}

function getFileType(filename: string): string {
  if (filename.endsWith('.js')) return 'JavaScript';
  if (filename.endsWith('.css')) return 'CSS';
  if (filename.endsWith('.html')) return 'HTML';
  if (filename.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'Image';
  if (filename.match(/\.(woff|woff2|ttf|eot)$/)) return 'Font';
  return 'Other';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getProgressBar(ratio: number, width: number = 20): string {
  const filled = Math.floor(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Run the analysis
analyzeBundleSize().catch(console.error);

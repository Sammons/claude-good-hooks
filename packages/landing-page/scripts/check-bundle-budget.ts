#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

async function checkBundleBudget() {
  console.log('📊 Bundle Budget Check');
  console.log('='.repeat(50));
  
  const budgetPath = path.join(process.cwd(), 'bundle-budget.json');
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(budgetPath)) {
    console.log('❌ No bundle-budget.json found');
    process.exit(1);
  }
  
  if (!fs.existsSync(assetsPath)) {
    console.log('❌ No build found. Run `npm run build` first.');
    process.exit(1);
  }
  
  const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
  const files = fs.readdirSync(assetsPath);
  
  let totalSize = 0;
  let totalGzipSize = 0;
  let jsSize = 0;
  let jsGzipSize = 0;
  let cssSize = 0;
  let cssGzipSize = 0;
  
  const results = [];
  let hasErrors = false;
  let hasWarnings = false;
  
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
    
    const fileType = getFileType(file);
    if (fileType === 'JavaScript') {
      jsSize += size;
      jsGzipSize += gzipSize;
    } else if (fileType === 'CSS') {
      cssSize += size;
      cssGzipSize += gzipSize;
    }
    
    // Check individual file budgets
    const individualBudget = budget.budgets.individual[fileType.toLowerCase()];
    if (individualBudget && gzipSize > individualBudget) {
      hasErrors = true;
      results.push({
        type: 'error',
        message: `${file} (${formatSize(gzipSize)}) exceeds individual ${fileType} budget (${formatSize(individualBudget)})`
      });
    }
    
    results.push({
      type: 'info',
      file,
      size,
      gzipSize,
      fileType
    });
  }
  
  // Check category budgets
  const budgets = budget.budgets;
  const warnings = budget.warnings;
  
  // JavaScript budget check
  if (jsGzipSize > budgets.javascript.budget) {
    hasErrors = true;
    results.push({
      type: 'error',
      message: `JavaScript bundle (${formatSize(jsGzipSize)}) exceeds budget (${formatSize(budgets.javascript.budget)})`
    });
  } else if (jsGzipSize > warnings.javascript) {
    hasWarnings = true;
    results.push({
      type: 'warning',
      message: `JavaScript bundle (${formatSize(jsGzipSize)}) approaching budget limit (${formatSize(budgets.javascript.budget)})`
    });
  }
  
  // CSS budget check
  if (cssGzipSize > budgets.css.budget) {
    hasErrors = true;
    results.push({
      type: 'error',
      message: `CSS bundle (${formatSize(cssGzipSize)}) exceeds budget (${formatSize(budgets.css.budget)})`
    });
  } else if (cssGzipSize > warnings.css) {
    hasWarnings = true;
    results.push({
      type: 'warning',
      message: `CSS bundle (${formatSize(cssGzipSize)}) approaching budget limit (${formatSize(budgets.css.budget)})`
    });
  }
  
  // Total budget check
  if (totalGzipSize > budgets.total.budget) {
    hasErrors = true;
    results.push({
      type: 'error',
      message: `Total bundle (${formatSize(totalGzipSize)}) exceeds budget (${formatSize(budgets.total.budget)})`
    });
  } else if (totalGzipSize > warnings.total) {
    hasWarnings = true;
    results.push({
      type: 'warning',
      message: `Total bundle (${formatSize(totalGzipSize)}) approaching budget limit (${formatSize(budgets.total.budget)})`
    });
  }
  
  // Check external dependencies
  const htmlPath = path.join(distPath, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const externalScripts = htmlContent.match(/<script[^>]*src="https?:\/\/[^"]*"/g) || [];
    const externalStyles = htmlContent.match(/<link[^>]*href="https?:\/\/[^"]*"/g) || [];
    const externalFonts = htmlContent.match(/<link[^>]*href="https:\/\/fonts\.[^"]*"/g) || [];
    
    const totalExternals = externalScripts.length + externalStyles.length + externalFonts.length;
    
    if (totalExternals > budget.externals.allowedCount) {
      hasWarnings = true;
      results.push({
        type: 'warning',
        message: `${totalExternals} external dependencies found (recommended: ${budget.externals.allowedCount} or fewer)`
      });
    }
  }
  
  // Display results
  console.log('\n📋 Budget Status:');
  console.log('-'.repeat(50));
  
  const categories = [
    { name: 'JavaScript', current: jsGzipSize, budget: budgets.javascript.budget },
    { name: 'CSS', current: cssGzipSize, budget: budgets.css.budget },
    { name: 'Total', current: totalGzipSize, budget: budgets.total.budget }
  ];
  
  categories.forEach(({ name, current, budget }) => {
    const percentage = (current / budget * 100).toFixed(1);
    const status = current <= budget ? '✅' : '❌';
    const progressBar = getProgressBar(current / budget);
    
    console.log(`${status} ${name}: ${formatSize(current)} / ${formatSize(budget)} (${percentage}%)`);
    console.log(`   ${progressBar}`);
  });
  
  // Display issues
  const errors = results.filter(r => r.type === 'error');
  const warningResults = results.filter(r => r.type === 'warning');
  
  if (errors.length > 0) {
    console.log('\n❌ Budget Errors:');
    console.log('-'.repeat(50));
    errors.forEach(error => console.log(`  • ${error.message}`));
  }
  
  if (warningResults.length > 0) {
    console.log('\n⚠️ Budget Warnings:');
    console.log('-'.repeat(50));
    warningResults.forEach(warning => console.log(`  • ${warning.message}`));
  }
  
  if (!hasErrors && !hasWarnings) {
    console.log('\n✅ All budget checks passed!');
  }
  
  console.log('\n📈 Optimization Suggestions:');
  console.log('-'.repeat(50));
  
  const suggestions = [];
  
  if (jsGzipSize > budgets.javascript.budget * 0.7) {
    suggestions.push('Consider code splitting or lazy loading for JavaScript modules');
  }
  
  if (cssGzipSize > budgets.css.budget * 0.7) {
    suggestions.push('Consider CSS purging or critical path extraction');
  }
  
  if (totalGzipSize > budgets.total.budget * 0.8) {
    suggestions.push('Consider enabling better compression or asset optimization');
  }
  
  const infoFiles = results.filter(r => r.type === 'info');
  const largeFiles = infoFiles.filter(r => r.gzipSize > 10000);
  if (largeFiles.length > 0) {
    suggestions.push(`Large files detected: ${largeFiles.map(f => f.file).join(', ')}`);
  }
  
  if (suggestions.length === 0) {
    console.log('No immediate optimizations needed.');
  } else {
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  }
  
  // Exit with appropriate code
  if (hasErrors) {
    console.log('\n❌ Bundle budget check failed!');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️ Bundle budget check passed with warnings.');
    process.exit(0);
  } else {
    console.log('\n✅ Bundle budget check passed!');
    process.exit(0);
  }
}

function getFileType(filename) {
  if (filename.endsWith('.js')) return 'JavaScript';
  if (filename.endsWith('.css')) return 'CSS';
  if (filename.endsWith('.html')) return 'HTML';
  if (filename.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'Image';
  if (filename.match(/\.(woff|woff2|ttf|eot)$/)) return 'Font';
  return 'Other';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getProgressBar(ratio, width = 20) {
  const filled = Math.floor(ratio * width);
  const empty = width - filled;
  const color = ratio <= 0.7 ? '█' : ratio <= 0.9 ? '▇' : '▆';
  return color.repeat(filled) + '░'.repeat(empty);
}

// Run the check
checkBundleBudget().catch(console.error);
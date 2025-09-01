#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

async function generateBundleBadge() {
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    console.log('No build found. Run npm run build first.');
    return;
  }
  
  const files = fs.readdirSync(assetsPath);
  let totalGzipSize = 0;
  
  for (const file of files) {
    if (file.endsWith('.map')) continue;
    
    const filePath = path.join(assetsPath, file);
    const content = fs.readFileSync(filePath);
    const gzipContent = await gzipAsync(content);
    totalGzipSize += gzipContent.length;
  }
  
  // Generate badge data
  const sizeInKB = (totalGzipSize / 1024).toFixed(1);
  const color = totalGzipSize < 30000 ? 'brightgreen' : 
                totalGzipSize < 50000 ? 'yellow' : 
                totalGzipSize < 100000 ? 'orange' : 'red';
  
  const badgeData = {
    schemaVersion: 1,
    label: "bundle size",
    message: `${sizeInKB} KB`,
    color: color,
    namedLogo: "webpack",
    logoColor: "white"
  };
  
  // Write badge data
  fs.writeFileSync('bundle-size-badge.json', JSON.stringify(badgeData, null, 2));
  
  // Generate shields.io URL
  const badgeUrl = `https://img.shields.io/badge/bundle%20size-${sizeInKB}%20KB-${color}?logo=webpack&logoColor=white`;
  
  console.log('Bundle Size Badge Generated');
  console.log('='.repeat(30));
  console.log(`Size: ${sizeInKB} KB (gzipped)`);
  console.log(`Color: ${color}`);
  console.log(`Badge URL: ${badgeUrl}`);
  console.log('');
  console.log('Markdown:');
  console.log(`![Bundle Size](${badgeUrl})`);
  console.log('');
  console.log('HTML:');
  console.log(`<img src="${badgeUrl}" alt="Bundle Size" />`);
  
  return {
    size: sizeInKB,
    color,
    url: badgeUrl,
    markdown: `![Bundle Size](${badgeUrl})`,
    html: `<img src="${badgeUrl}" alt="Bundle Size" />`
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBundleBadge().catch(console.error);
}

export { generateBundleBadge };
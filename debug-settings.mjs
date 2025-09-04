#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
console.log('Checking settings at:', settingsPath);
console.log('Exists:', fs.existsSync(settingsPath));

if (fs.existsSync(settingsPath)) {
  const content = fs.readFileSync(settingsPath, 'utf-8');
  const settings = JSON.parse(content);
  console.log('Settings content:', JSON.stringify(settings.hooks, null, 2));
}
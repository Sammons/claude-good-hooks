#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Simulate the HookService logic
const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
if (!fs.existsSync(settingsPath)) {
  console.log('No settings file found');
  process.exit(1);
}

const content = fs.readFileSync(settingsPath, 'utf-8');
const settings = JSON.parse(content);

console.log('Settings loaded:', settings ? 'yes' : 'no');
console.log('Has hooks:', settings.hooks ? 'yes' : 'no');

if (settings.hooks) {
  console.log('Hook events found:', Object.keys(settings.hooks));
  
  for (const [eventName, configs] of Object.entries(settings.hooks)) {
    console.log(`\nEvent: ${eventName}`);
    console.log(`Configs count: ${configs.length}`);
    
    if (Array.isArray(configs)) {
      for (const [index, config] of configs.entries()) {
        console.log(`  Config ${index}:`, {
          name: config.claudegoodhooks?.name || 'no name',
          description: config.claudegoodhooks?.description || 'no description',
          version: config.claudegoodhooks?.version || 'no version'
        });
      }
    }
  }
}
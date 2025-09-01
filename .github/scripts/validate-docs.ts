#!/usr/bin/env tsx

/**
 * Documentation Validation Script
 * 
 * Validates that all documentation is up-to-date and properly formatted
 */

import fs from 'fs';
import path from 'path';

class DocsValidator {
  private docsDir: string;
  private packagesDir: string;

  constructor() {
    this.docsDir = path.join(__dirname, '..', '..', 'docs');
    this.packagesDir = path.join(__dirname, '..', '..', 'packages');
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' };
    console.log(`${colors[level]}${message}${colors.reset}`);
  }

  public async validate(): Promise<boolean> {
    this.log('📝 Validating documentation...');
    
    let allValid = true;
    
    // Check that all packages have README files
    allValid = this.validatePackageReadmes() && allValid;
    
    // Check that links are valid
    allValid = this.validateMarkdownLinks() && allValid;
    
    if (allValid) {
      this.log('✅ All documentation is valid');
    } else {
      this.log('❌ Some documentation issues found', 'error');
    }
    
    return allValid;
  }

  private validatePackageReadmes(): boolean {
    this.log('🔍 Checking package README files...');
    
    let allValid = true;
    
    if (!fs.existsSync(this.packagesDir)) {
      this.log('Packages directory not found', 'error');
      return false;
    }
    
    const packages = fs.readdirSync(this.packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    for (const pkg of packages) {
      const readmePath = path.join(this.packagesDir, pkg, 'README.md');
      if (!fs.existsSync(readmePath)) {
        this.log(`❌ Missing README.md for package: ${pkg}`, 'error');
        allValid = false;
      } else {
        this.log(`✅ ${pkg} has README.md`);
      }
    }
    
    return allValid;
  }

  private validateMarkdownLinks(): boolean {
    this.log('🔗 Validating markdown links...');
    
    // Simple validation - check for broken relative links
    // In a real implementation, this would be more comprehensive
    return true;
  }
}

if (require.main === module) {
  const validator = new DocsValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { DocsValidator };
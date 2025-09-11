#!/usr/bin/env node

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

interface SecurityScannerConfig {
  /** Enable security scanning */
  enabled?: boolean;
  /** Secret detection patterns */
  secretPatterns?: Array<{ name: string; pattern: string; severity: 'low' | 'medium' | 'high' }>;
  /** Dependency scanning tools */
  dependencyTools?: string[];
  /** Code analysis tools */
  codeAnalysisTools?: string[];
  /** Files to exclude from scanning */
  excludePatterns?: string[];
  /** Fail on security issues */
  failOnIssues?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'low' | 'medium' | 'high';
}

const DEFAULT_SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: 'AKIA[0-9A-Z]{16}', severity: 'high' as const },
  { name: 'AWS Secret Key', pattern: '[0-9a-zA-Z/+]{40}', severity: 'high' as const },
  { name: 'GitHub Token', pattern: 'ghp_[0-9a-zA-Z]{36}', severity: 'high' as const },
  {
    name: 'Generic API Key',
    pattern: 'api[_-]?key[\\s]*[:=][\\s]*["\']?[0-9a-zA-Z]{20,}',
    severity: 'medium' as const,
  },
  {
    name: 'Password in Code',
    pattern: 'password[\\s]*[:=][\\s]*["\'][^"\'\\s]{8,}',
    severity: 'medium' as const,
  },
  { name: 'Private Key', pattern: '-----BEGIN [A-Z]+ PRIVATE KEY-----', severity: 'high' as const },
];

const DEFAULT_CONFIG: Required<SecurityScannerConfig> = {
  enabled: true,
  secretPatterns: DEFAULT_SECRET_PATTERNS,
  dependencyTools: ['npm audit', 'safety check', 'cargo audit'],
  codeAnalysisTools: ['eslint --ext .js,.ts --config .eslintrc-security.js', 'bandit', 'semgrep'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/test/**', '**/tests/**'],
  failOnIssues: true,
  minSeverity: 'medium',
};

class SecurityScannerHook {
  private config: Required<SecurityScannerConfig>;

  constructor(config: SecurityScannerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      secretPatterns: [...DEFAULT_SECRET_PATTERNS, ...(config.secretPatterns || [])],
    };
  }

  /**
   * Scan file for secrets and security issues
   */
  async scanFile(filePath: string): Promise<{
    issues: Array<{
      type: 'secret' | 'vulnerability';
      severity: 'low' | 'medium' | 'high';
      message: string;
      line?: number;
      column?: number;
    }>;
  }> {
    const issues: any[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\\n');

      // Scan for secrets
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        for (const pattern of this.config.secretPatterns) {
          const regex = new RegExp(pattern.pattern, 'gi');
          let match;

          while ((match = regex.exec(line)) !== null) {
            issues.push({
              type: 'secret',
              severity: pattern.severity,
              message: `Potential ${pattern.name} detected`,
              line: lineIndex + 1,
              column: match.index + 1,
            });
          }
        }
      }

      // Additional security checks
      await this.performAdditionalChecks(filePath, content, issues);
    } catch (error) {
      // File might not exist or be readable
      console.warn(`Could not scan file ${filePath}:`, error);
    }

    return { issues: issues.filter(issue => this.meetsSeverityThreshold(issue.severity)) };
  }

  /**
   * Perform additional security checks
   */
  private async performAdditionalChecks(
    filePath: string,
    content: string,
    issues: any[]
  ): Promise<void> {
    const ext = path.extname(filePath);

    // JavaScript/TypeScript specific checks
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      // Check for eval usage
      if (content.includes('eval(')) {
        issues.push({
          type: 'vulnerability',
          severity: 'high',
          message: 'Use of eval() detected - potential code injection risk',
        });
      }

      // Check for innerHTML usage
      if (content.match(/\.innerHTML\\s*=/)) {
        issues.push({
          type: 'vulnerability',
          severity: 'medium',
          message: 'Use of innerHTML detected - potential XSS risk',
        });
      }

      // Check for document.write
      if (content.includes('document.write')) {
        issues.push({
          type: 'vulnerability',
          severity: 'medium',
          message: 'Use of document.write detected - potential XSS risk',
        });
      }
    }

    // Python specific checks
    if (ext === '.py') {
      // Check for shell execution
      if (content.match(/(os\\.system|subprocess\\.call|exec\\(|eval\\()/)) {
        issues.push({
          type: 'vulnerability',
          severity: 'high',
          message: 'Potential command injection or code execution detected',
        });
      }

      // Check for SQL query construction
      if (content.match(/["']\\s*SELECT\\s+.*\\s*\\+/i)) {
        issues.push({
          type: 'vulnerability',
          severity: 'high',
          message: 'Potential SQL injection - use parameterized queries',
        });
      }
    }

    // Generic checks
    if (content.match(/password\\s*=\\s*["'][^"']*["']/i)) {
      issues.push({
        type: 'secret',
        severity: 'medium',
        message: 'Hardcoded password detected',
      });
    }
  }

  /**
   * Run dependency security audit
   */
  async runDependencyAudit(): Promise<{
    success: boolean;
    output: string;
    issues: number;
  }> {
    const results: any[] = [];

    for (const tool of this.config.dependencyTools) {
      try {
        const result = await this.runCommand(tool);
        results.push({
          tool,
          success: result.exitCode === 0,
          output: result.output,
          error: result.error,
        });
      } catch (error) {
        // Tool might not be available
        continue;
      }
    }

    // Parse results for issues
    let totalIssues = 0;
    let output = '';

    for (const result of results) {
      if (result.output) {
        output += `\\n${result.tool} results:\\n${result.output}`;

        // Count issues (simplified parsing)
        const vulnerabilities = (result.output.match(/vulnerability|vulnerable|risk/gi) || [])
          .length;
        totalIssues += vulnerabilities;
      }
    }

    return {
      success: results.some(r => r.success),
      output,
      issues: totalIssues,
    };
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(severity: 'low' | 'medium' | 'high'): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3 };
    return severityLevels[severity] >= severityLevels[this.config.minSeverity];
  }

  /**
   * Format security scan results
   */
  formatResults(fileResults: any[], auditResults?: any): string {
    let output = '\\n🔒 Security Scan Results:\\n';

    let totalIssues = 0;
    let highSeverityIssues = 0;

    for (const result of fileResults) {
      if (result.issues.length > 0) {
        output += `\\n📄 ${path.basename(result.file)}:\\n`;

        for (const issue of result.issues) {
          const icon = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : '💡';
          output += `  ${icon} ${issue.message}`;

          if (issue.line) {
            output += ` (line ${issue.line})`;
          }

          output += '\\n';

          totalIssues++;
          if (issue.severity === 'high') {
            highSeverityIssues++;
          }
        }
      }
    }

    if (auditResults && auditResults.issues > 0) {
      output += `\\n🔍 Dependency Audit: ${auditResults.issues} issues found\\n`;
      totalIssues += auditResults.issues;
    }

    if (totalIssues === 0) {
      output += '✅ No security issues detected\\n';
    } else {
      output += `\\n📊 Summary: ${totalIssues} total issues`;
      if (highSeverityIssues > 0) {
        output += ` (${highSeverityIssues} high severity)`;
      }
      output += '\\n';
    }

    return output;
  }

  /**
   * Extract file paths from tool input
   */
  extractFilePaths(toolInput: any): string[] {
    const paths: string[] = [];

    if (toolInput?.file_path) {
      paths.push(toolInput.file_path);
    }

    if (toolInput?.filePath) {
      paths.push(toolInput.filePath);
    }

    return paths.filter(Boolean);
  }

  /**
   * Check if file should be scanned
   */
  private shouldScanFile(filePath: string): boolean {
    return !this.config.excludePatterns.some(pattern => this.matchesPattern(filePath, pattern));
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Run shell command
   */
  private async runCommand(command: string): Promise<{
    exitCode: number;
    output: string;
    error: string;
  }> {
    return new Promise(resolve => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', data => {
        output += data.toString();
      });

      child.stderr?.on('data', data => {
        error += data.toString();
      });

      child.on('close', code => {
        resolve({
          exitCode: code || 0,
          output: output.trim(),
          error: error.trim(),
        });
      });

      child.on('error', err => {
        resolve({
          exitCode: 1,
          output: '',
          error: err.message,
        });
      });
    });
  }
}

// Hook implementation
const securityScannerHook: HookPlugin = {
  name: 'security-scanner',
  description: 'Comprehensive security scanning for code and dependencies',
  version: '1.0.0',
  customArgs: {
    enabled: {
      description: 'Enable security scanning',
      type: 'boolean',
      default: true,
    },
    failOnIssues: {
      description: 'Fail hook execution if security issues are found',
      type: 'boolean',
      default: true,
    },
    minSeverity: {
      description: 'Minimum severity level to report (low, medium, high)',
      type: 'string',
      default: 'medium',
    },
  },
  makeHook: args => {
    const config: SecurityScannerConfig = {
      enabled: args.enabled as boolean,
      failOnIssues: args.failOnIssues as boolean,
      minSeverity: args.minSeverity as 'low' | 'medium' | 'high',
    };

    const scanner = new SecurityScannerHook(config);

    return {
      PreToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command' as const,
              command: `node -e "
            const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
            const { SecurityScannerHook } = require('./dist/index.js');
            const scanner = new SecurityScannerHook(${JSON.stringify(config)});
            
            (async () => {
              try {
                const filePaths = scanner.extractFilePaths(input.tool_input || {});
                if (filePaths.length === 0) process.exit(0);
                
                const results = [];
                for (const filePath of filePaths) {
                  if (scanner.shouldScanFile && scanner.shouldScanFile(filePath)) {
                    const result = await scanner.scanFile(filePath);
                    if (result.issues.length > 0) {
                      results.push({ file: filePath, issues: result.issues });
                    }
                  }
                }
                
                if (results.length > 0) {
                  const output = scanner.formatResults(results);
                  console.log(output);
                  
                  if (${config.failOnIssues}) {
                    console.error('🚫 Security issues detected - blocking operation');
                    process.exit(2);
                  }
                }
              } catch (error) {
                console.error('🔒 Security scanner error:', error);
                if (${config.failOnIssues}) process.exit(2);
              }
            })();
          "`,
              timeout: 15000,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command' as const,
              command: `node -e "
            const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
            const { SecurityScannerHook } = require('./dist/index.js');
            const scanner = new SecurityScannerHook(${JSON.stringify(config)});
            
            (async () => {
              try {
                const filePaths = scanner.extractFilePaths(input.tool_input || {});
                if (filePaths.length === 0) process.exit(0);
                
                const results = [];
                for (const filePath of filePaths) {
                  if (scanner.shouldScanFile && scanner.shouldScanFile(filePath)) {
                    const result = await scanner.scanFile(filePath);
                    if (result.issues.length > 0) {
                      results.push({ file: filePath, issues: result.issues });
                    }
                  }
                }
                
                if (results.length > 0) {
                  const output = scanner.formatResults(results);
                  console.log(output);
                }
              } catch (error) {
                console.error('🔒 Post-scan security check error:', error);
              }
            })();
          "`,
              timeout: 15000,
            },
          ],
        },
      ],
    };
  },
};

export default securityScannerHook;
export { SecurityScannerHook, type SecurityScannerConfig };

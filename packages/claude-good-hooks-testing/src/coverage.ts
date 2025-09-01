import { promises as fs } from 'fs';
import path from 'path';
import type { CoverageConfig, TestResultSummary } from './types.js';

/**
 * Coverage tracking and reporting for hook tests
 */
export class CoverageTracker {
  private config: Required<CoverageConfig>;
  private coverageData: Map<string, CoverageInfo> = new Map();

  constructor(config: CoverageConfig = {}) {
    this.config = {
      include: config.include || ['**/*.{js,ts}'],
      exclude: config.exclude || ['**/node_modules/**', '**/dist/**', '**/*.test.{js,ts}'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        ...config.thresholds
      },
      outputDir: config.outputDir || './coverage',
      formats: config.formats || ['html', 'json', 'text']
    };
  }

  /**
   * Start coverage tracking for a test run
   */
  async startCoverage(): Promise<void> {
    this.coverageData.clear();
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  /**
   * Record coverage data for a file
   */
  recordCoverage(filePath: string, coverage: FileCoverage): void {
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (!this.shouldIncludeFile(relativePath)) {
      return;
    }

    const existing = this.coverageData.get(relativePath);
    if (existing) {
      // Merge coverage data
      this.coverageData.set(relativePath, this.mergeCoverage(existing.coverage, coverage));
    } else {
      this.coverageData.set(relativePath, {
        filePath: relativePath,
        coverage,
        timestamp: new Date()
      });
    }
  }

  /**
   * Generate coverage report
   */
  async generateReport(): Promise<CoverageReport> {
    const summary = this.calculateSummary();
    const report: CoverageReport = {
      summary,
      files: Array.from(this.coverageData.values()),
      timestamp: new Date(),
      thresholds: this.config.thresholds
    };

    // Generate reports in requested formats
    for (const format of this.config.formats) {
      await this.generateFormatReport(report, format);
    }

    return report;
  }

  /**
   * Check if coverage meets thresholds
   */
  checkThresholds(summary: CoverageSummary): { passed: boolean; failures: string[] } {
    const failures: string[] = [];
    
    if (summary.statements < this.config.thresholds.statements!) {
      failures.push(`Statements coverage ${summary.statements}% below threshold ${this.config.thresholds.statements}%`);
    }
    
    if (summary.branches < this.config.thresholds.branches!) {
      failures.push(`Branches coverage ${summary.branches}% below threshold ${this.config.thresholds.branches}%`);
    }
    
    if (summary.functions < this.config.thresholds.functions!) {
      failures.push(`Functions coverage ${summary.functions}% below threshold ${this.config.thresholds.functions}%`);
    }
    
    if (summary.lines < this.config.thresholds.lines!) {
      failures.push(`Lines coverage ${summary.lines}% below threshold ${this.config.thresholds.lines}%`);
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }

  /**
   * Calculate overall coverage summary
   */
  private calculateSummary(): CoverageSummary {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    for (const info of this.coverageData.values()) {
      const { coverage } = info;
      
      totalStatements += coverage.statements.total;
      coveredStatements += coverage.statements.covered;
      
      totalBranches += coverage.branches.total;
      coveredBranches += coverage.branches.covered;
      
      totalFunctions += coverage.functions.total;
      coveredFunctions += coverage.functions.covered;
      
      totalLines += coverage.lines.total;
      coveredLines += coverage.lines.covered;
    }

    return {
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
    };
  }

  /**
   * Check if file should be included in coverage
   */
  private shouldIncludeFile(filePath: string): boolean {
    // Check exclude patterns first
    for (const pattern of this.config.exclude) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.include) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Merge two coverage objects
   */
  private mergeCoverage(existing: FileCoverage, incoming: FileCoverage): FileCoverage {
    return {
      statements: {
        total: Math.max(existing.statements.total, incoming.statements.total),
        covered: Math.max(existing.statements.covered, incoming.statements.covered)
      },
      branches: {
        total: Math.max(existing.branches.total, incoming.branches.total),
        covered: Math.max(existing.branches.covered, incoming.branches.covered)
      },
      functions: {
        total: Math.max(existing.functions.total, incoming.functions.total),
        covered: Math.max(existing.functions.covered, incoming.functions.covered)
      },
      lines: {
        total: Math.max(existing.lines.total, incoming.lines.total),
        covered: Math.max(existing.lines.covered, incoming.lines.covered)
      }
    };
  }

  /**
   * Generate report in specific format
   */
  private async generateFormatReport(report: CoverageReport, format: string): Promise<void> {
    switch (format) {
      case 'json':
        await this.generateJsonReport(report);
        break;
      case 'html':
        await this.generateHtmlReport(report);
        break;
      case 'text':
        await this.generateTextReport(report);
        break;
      case 'lcov':
        await this.generateLcovReport(report);
        break;
    }
  }

  /**
   * Generate JSON coverage report
   */
  private async generateJsonReport(report: CoverageReport): Promise<void> {
    const jsonPath = path.join(this.config.outputDir, 'coverage.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate HTML coverage report
   */
  private async generateHtmlReport(report: CoverageReport): Promise<void> {
    const htmlDir = path.join(this.config.outputDir, 'html');
    await fs.mkdir(htmlDir, { recursive: true });

    const html = this.generateHtmlContent(report);
    const indexPath = path.join(htmlDir, 'index.html');
    await fs.writeFile(indexPath, html);
  }

  /**
   * Generate text coverage report
   */
  private async generateTextReport(report: CoverageReport): Promise<void> {
    const text = this.generateTextContent(report);
    const textPath = path.join(this.config.outputDir, 'coverage.txt');
    await fs.writeFile(textPath, text);
  }

  /**
   * Generate LCOV coverage report
   */
  private async generateLcovReport(report: CoverageReport): Promise<void> {
    const lcov = this.generateLcovContent(report);
    const lcovPath = path.join(this.config.outputDir, 'coverage.lcov');
    await fs.writeFile(lcovPath, lcov);
  }

  /**
   * Generate HTML content for coverage report
   */
  private generateHtmlContent(report: CoverageReport): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; }
        .high { color: #28a745; }
        .medium { color: #ffc107; }
        .low { color: #dc3545; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .bar { height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <h1>Coverage Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Statements:</strong> 
            <span class="${this.getCoverageClass(report.summary.statements)}">${report.summary.statements}%</span>
        </div>
        <div class="metric">
            <strong>Branches:</strong> 
            <span class="${this.getCoverageClass(report.summary.branches)}">${report.summary.branches}%</span>
        </div>
        <div class="metric">
            <strong>Functions:</strong> 
            <span class="${this.getCoverageClass(report.summary.functions)}">${report.summary.functions}%</span>
        </div>
        <div class="metric">
            <strong>Lines:</strong> 
            <span class="${this.getCoverageClass(report.summary.lines)}">${report.summary.lines}%</span>
        </div>
    </div>
    
    <h2>Files</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Statements</th>
                <th>Branches</th>
                <th>Functions</th>
                <th>Lines</th>
            </tr>
        </thead>
        <tbody>
            ${report.files.map(file => `
                <tr>
                    <td>${file.filePath}</td>
                    <td>${this.formatCoverageCell(file.coverage.statements)}</td>
                    <td>${this.formatCoverageCell(file.coverage.branches)}</td>
                    <td>${this.formatCoverageCell(file.coverage.functions)}</td>
                    <td>${this.formatCoverageCell(file.coverage.lines)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <p><small>Generated at: ${report.timestamp.toISOString()}</small></p>
</body>
</html>`;
  }

  /**
   * Generate text content for coverage report
   */
  private generateTextContent(report: CoverageReport): string {
    let text = 'Coverage Report\\n';
    text += '===============\\n\\n';
    
    text += 'Summary:\\n';
    text += `  Statements: ${report.summary.statements}%\\n`;
    text += `  Branches:   ${report.summary.branches}%\\n`;
    text += `  Functions:  ${report.summary.functions}%\\n`;
    text += `  Lines:      ${report.summary.lines}%\\n\\n`;
    
    text += 'Files:\\n';
    for (const file of report.files) {
      text += `  ${file.filePath}\\n`;
      text += `    Statements: ${this.formatCoverageText(file.coverage.statements)}\\n`;
      text += `    Branches:   ${this.formatCoverageText(file.coverage.branches)}\\n`;
      text += `    Functions:  ${this.formatCoverageText(file.coverage.functions)}\\n`;
      text += `    Lines:      ${this.formatCoverageText(file.coverage.lines)}\\n\\n`;
    }
    
    return text;
  }

  /**
   * Generate LCOV content for coverage report
   */
  private generateLcovContent(report: CoverageReport): string {
    let lcov = '';
    
    for (const file of report.files) {
      lcov += `SF:${file.filePath}\\n`;
      lcov += `FNF:${file.coverage.functions.total}\\n`;
      lcov += `FNH:${file.coverage.functions.covered}\\n`;
      lcov += `LF:${file.coverage.lines.total}\\n`;
      lcov += `LH:${file.coverage.lines.covered}\\n`;
      lcov += `BRF:${file.coverage.branches.total}\\n`;
      lcov += `BRH:${file.coverage.branches.covered}\\n`;
      lcov += 'end_of_record\\n';
    }
    
    return lcov;
  }

  /**
   * Get CSS class for coverage percentage
   */
  private getCoverageClass(percentage: number): string {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  }

  /**
   * Format coverage cell for HTML
   */
  private formatCoverageCell(coverage: { total: number; covered: number }): string {
    const percentage = coverage.total > 0 ? Math.round((coverage.covered / coverage.total) * 100) : 0;
    const cssClass = this.getCoverageClass(percentage);
    return `<span class="${cssClass}">${percentage}%</span> (${coverage.covered}/${coverage.total})`;
  }

  /**
   * Format coverage for text output
   */
  private formatCoverageText(coverage: { total: number; covered: number }): string {
    const percentage = coverage.total > 0 ? Math.round((coverage.covered / coverage.total) * 100) : 0;
    return `${percentage}% (${coverage.covered}/${coverage.total})`;
  }
}

// Type definitions for coverage tracking

interface FileCoverage {
  statements: { total: number; covered: number };
  branches: { total: number; covered: number };
  functions: { total: number; covered: number };
  lines: { total: number; covered: number };
}

interface CoverageInfo {
  filePath: string;
  coverage: FileCoverage;
  timestamp: Date;
}

interface CoverageSummary {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface CoverageReport {
  summary: CoverageSummary;
  files: CoverageInfo[];
  timestamp: Date;
  thresholds: Required<CoverageConfig['thresholds']>;
}

export type { FileCoverage, CoverageInfo, CoverageSummary, CoverageReport };
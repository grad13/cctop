/**
 * Header and Footer Renderer
 * Renders header and footer sections of the CLI display
 */

import chalk = require('chalk');
import { padEndWithWidth } from '../../utils/display-width';
import { CLIDisplayLegacyWidthConfig, CLIDisplayLegacyStats } from '../../types';

export class HeaderFooterRenderer {
  private widthConfig: CLIDisplayLegacyWidthConfig;
  private stats: CLIDisplayLegacyStats;

  constructor(widthConfig: CLIDisplayLegacyWidthConfig) {
    this.widthConfig = widthConfig;
    this.stats = {
      totalEvents: 0,
      uniqueFiles: 0,
      eventsPerSecond: 0
    };
  }

  /**
   * Build header lines
   */
  buildHeader(): string[] {
    const lines: string[] = [];
    
    // Title
    lines.push(chalk.bold.blue('📊 File System Monitor - Real-time Events'));
    lines.push('');
    
    // Column headers
    const headerParts = [
      padEndWithWidth('Time', 8),
      chalk.gray('│'),
      padEndWithWidth('Elapsed', 7),
      chalk.gray('│'),
      padEndWithWidth('File Name', this.widthConfig.fileNameWidth),
      chalk.gray('│'),
      padEndWithWidth('Event', 6),
      chalk.gray('│'),
      padEndWithWidth('Directory', this.widthConfig.directoryWidth),
      chalk.gray('│'),
      padEndWithWidth('Size', 10),
      chalk.gray('│'),
      padEndWithWidth('Lines', 8)
    ];
    
    lines.push(headerParts.join(' '));
    lines.push(chalk.gray('─'.repeat(this.widthConfig.totalWidth)));
    
    return lines;
  }

  /**
   * Build footer lines
   */
  buildFooter(displayMode: 'all' | 'unique', filterStatus?: string): string[] {
    const lines: string[] = [];
    
    lines.push(chalk.gray('─'.repeat(this.widthConfig.totalWidth)));
    
    const statsLine = this.formatStatsLine(displayMode);
    lines.push(statsLine);
    
    if (filterStatus) {
      lines.push(filterStatus);
    }
    
    const helpLine = chalk.gray('Press ') + chalk.yellow('a') + 
                   chalk.gray(' for all events, ') + chalk.yellow('u') + 
                   chalk.gray(' for unique files, ') + chalk.yellow('q') + 
                   chalk.gray(' to quit');
    lines.push(helpLine);
    
    return lines;
  }

  /**
   * Format statistics line
   */
  private formatStatsLine(displayMode: 'all' | 'unique'): string {
    const modeIndicator = displayMode === 'all' 
      ? chalk.green('[All Events]') 
      : chalk.cyan('[Unique Files]');
    
    const stats = [
      modeIndicator,
      chalk.gray('│'),
      `Total: ${chalk.yellow(this.stats.totalEvents.toLocaleString())}`,
      chalk.gray('│'),
      `Unique: ${chalk.yellow(this.stats.uniqueFiles.toLocaleString())}`,
      chalk.gray('│'),
      `Rate: ${chalk.yellow(this.stats.eventsPerSecond.toFixed(1))}/s`
    ];
    
    return stats.join(' ');
  }

  /**
   * Update statistics
   */
  updateStats(stats: Partial<CLIDisplayLegacyStats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  /**
   * Update width configuration
   */
  updateWidthConfig(widthConfig: CLIDisplayLegacyWidthConfig): void {
    this.widthConfig = widthConfig;
  }

  /**
   * Get current stats
   */
  getStats(): CLIDisplayLegacyStats {
    return { ...this.stats };
  }
}
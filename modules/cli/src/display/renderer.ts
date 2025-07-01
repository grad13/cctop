/**
 * Terminal renderer for CLI display
 */

import { FileEvent, EventStats } from '@cctop/shared';
import { CLIConfig } from '@cctop/shared';
import { EventFormatter } from './formatter';
import chalk from 'chalk';
import cliWidth from 'cli-width';

export class TerminalRenderer {
  private formatter: EventFormatter;
  private config: CLIConfig;
  private isInteractive: boolean;

  constructor(config: CLIConfig, isInteractive: boolean = true) {
    this.config = config;
    this.isInteractive = isInteractive;
    this.formatter = new EventFormatter(config, this.getTerminalWidth());
  }

  clear(): void {
    if (this.isInteractive) {
      process.stdout.write('\x1b[2J\x1b[H'); // Clear screen and move to top
    }
  }

  renderEvents(events: FileEvent[], stats?: EventStats): void {
    const lines: string[] = [];
    
    // Title
    lines.push(this.renderTitle());
    lines.push('');
    
    // Stats
    if (stats && this.config.statusArea.enabled) {
      lines.push(...this.renderStats(stats));
      lines.push('');
    }
    
    // Header
    lines.push(this.formatter.formatHeader());
    lines.push(this.renderSeparator());
    
    // Events
    const visibleEvents = events.slice(0, this.config.display.maxEvents);
    for (const event of visibleEvents) {
      lines.push(this.formatter.formatEvent(event));
    }
    
    // Output
    if (this.isInteractive) {
      this.clear();
    }
    
    process.stdout.write(lines.join('\n') + '\n');
  }

  renderStats(stats: EventStats): string[] {
    const lines: string[] = [];
    const width = this.getTerminalWidth();
    
    // Summary line
    const summary = [
      `Total Events: ${chalk.cyan(stats.totalEvents)}`,
      `Files: ${chalk.green(stats.totalFiles)}`,
      `Size: ${chalk.yellow(this.formatBytes(stats.totalSize))}`,
      `Lines: ${chalk.magenta(stats.totalLines)}`
    ].join(' | ');
    
    lines.push(chalk.dim(summary));
    
    // Event type breakdown
    const eventTypes = Object.entries(stats.eventsByType)
      .map(([type, count]) => {
        const color = this.config.colors[type] || 'white';
        const chalkColor = chalk[color as keyof typeof chalk] as (text: string) => string;
        return chalkColor ? chalkColor(`${type}: ${count}`) : chalk.white(`${type}: ${count}`);
      })
      .join(' ');
    
    lines.push(chalk.dim(eventTypes));
    
    return lines;
  }

  renderError(error: Error): void {
    const message = chalk.red(`Error: ${error.message}`);
    if (this.isInteractive) {
      this.clear();
    }
    console.error(message);
  }

  private renderTitle(): string {
    const title = 'CCTOP - Code Change Monitor';
    const version = 'v0.3.0';
    const titleLine = `${chalk.bold.cyan(title)} ${chalk.dim(version)}`;
    return titleLine;
  }

  private renderSeparator(): string {
    const width = this.getTerminalWidth();
    return chalk.dim('─'.repeat(width));
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private getTerminalWidth(): number {
    return cliWidth({ defaultWidth: 80 });
  }

  updateConfig(config: CLIConfig): void {
    this.config = config;
    this.formatter = new EventFormatter(config, this.getTerminalWidth());
  }
}
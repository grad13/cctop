import { FileEvent } from '@cctop/shared';
import * as path from 'path';
import chalk from 'chalk';

export interface FormatterOptions {
  maxWidth: number;
  colorEnabled: boolean;
}

export class EventFormatter {
  private options: FormatterOptions;

  constructor(options: FormatterOptions) {
    this.options = options;
  }

  formatEvent(event: FileEvent): string {
    const timestamp = this.formatTimestamp(event.timestamp);
    const eventType = this.formatEventType(event.eventType);
    const filePath = this.formatPath(event.relativePath, event.isDirectory);
    const size = this.formatSize(event.size);

    return `${timestamp} ${eventType} ${filePath} ${size}`.trim();
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return this.options.colorEnabled
      ? chalk.gray(`${hours}:${minutes}:${seconds}`)
      : `${hours}:${minutes}:${seconds}`;
  }

  private formatEventType(eventType: FileEvent['eventType']): string {
    const typeMap = {
      find: { symbol: '◯', color: chalk.blue },
      create: { symbol: '+', color: chalk.green },
      modify: { symbol: '~', color: chalk.yellow },
      delete: { symbol: '-', color: chalk.red },
      move: { symbol: '→', color: chalk.magenta }
    };

    const { symbol, color } = typeMap[eventType];
    
    return this.options.colorEnabled
      ? color(symbol.padEnd(3))
      : symbol.padEnd(3);
  }

  private formatPath(relativePath: string, isDirectory: boolean): string {
    const maxPathLength = this.options.maxWidth - 20; // Reserve space for timestamp and size
    let displayPath = relativePath;

    if (displayPath.length > maxPathLength) {
      const fileName = path.basename(displayPath);
      const dirPath = path.dirname(displayPath);
      const availableSpace = maxPathLength - fileName.length - 4; // 4 for ".../"
      
      if (availableSpace > 0) {
        const truncatedDir = dirPath.substring(dirPath.length - availableSpace);
        displayPath = `.../${truncatedDir}/${fileName}`;
      } else {
        displayPath = `...${fileName.substring(fileName.length - maxPathLength + 3)}`;
      }
    }

    if (isDirectory && !displayPath.endsWith('/')) {
      displayPath += '/';
    }

    return this.options.colorEnabled && isDirectory
      ? chalk.cyan(displayPath)
      : displayPath;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '';

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, index)).toFixed(1);

    const formatted = `${size}${units[index]}`.padStart(8);
    
    return this.options.colorEnabled
      ? chalk.gray(formatted)
      : formatted;
  }

  formatStats(stats: any): string[] {
    const lines: string[] = [];
    
    lines.push(this.options.colorEnabled 
      ? chalk.bold('Project Statistics')
      : 'Project Statistics'
    );
    lines.push('─'.repeat(40));
    lines.push(`Files: ${stats.totalFiles}`);
    lines.push(`Directories: ${stats.totalDirectories}`);
    lines.push(`Total Size: ${this.formatSize(stats.totalSize).trim()}`);
    lines.push(`Last Activity: ${stats.lastActivity || 'N/A'}`);
    
    return lines;
  }
}
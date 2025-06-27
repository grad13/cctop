/**
 * FUNC-204: Responsive Directory Display Integration Test
 * Tests terminal resize handling and dynamic directory column width
 * 
 * FUNC-204 Requirements:
 * - Terminal resize event detection and response
 * - Dynamic directory column width calculation (rightmost column)
 * - Path tail-priority truncation (preserve important parts)
 * - Immediate re-layout on window size change
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-204: Responsive Directory Display', () => {
  let testDir;
  let cctopProcess;
  
  beforeEach(async () => {
    // Create test directory with nested structure
    testDir = `/tmp/cctop-responsive-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create nested directories to test responsive display
    const deepDir = path.join(testDir, 'very', 'deep', 'nested', 'directory', 'structure');
    fs.mkdirSync(deepDir, { recursive: true });
    
    // Create files in different depth levels
    fs.writeFileSync(path.join(testDir, 'root-file.txt'), 'root level');
    fs.writeFileSync(path.join(testDir, 'very', 'level2-file.txt'), 'level 2');
    fs.writeFileSync(path.join(deepDir, 'deep-file.txt'), 'deep level');
  });
  
  afterEach(async () => {
    // Clean up
    if (cctopProcess && !cctopProcess.killed) {
      cctopProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Remove test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should adapt directory column width to narrow terminal (80 columns)', async () => {
    let narrowOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '80',  // Narrow terminal
        LINES: '24'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      narrowOutput += data.toString();
    });

    // Wait for files to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FUNC-204 Requirement: Dynamic width calculation
    const lines = narrowOutput.split('\n');
    const fileLines = lines.filter(line => 
      line.includes('root-file.txt') || 
      line.includes('level2-file.txt') || 
      line.includes('deep-file.txt')
    );

    expect(fileLines.length, 'Should display files from different directory levels').toBeGreaterThan(2);

    // In narrow terminal, directory paths should be truncated
    const hasDirectoryDisplay = fileLines.some(line => {
      // Remove ANSI color codes for accurate analysis
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      return cleanLine.includes('./') || 
             cleanLine.includes('very/') || 
             cleanLine.includes('directory/') ||
             cleanLine.includes('structure');
    });

    expect(hasDirectoryDisplay, 'Should show directory information').toBe(true);

    // Lines should not exceed terminal width (80 columns)
    const exceedsWidth = fileLines.some(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      return cleanLine.length > 85; // Allow some margin
    });

    expect(exceedsWidth, 'Lines should not exceed narrow terminal width').toBe(false);
  }, 8000);

  test('should expand directory column width in wide terminal (120 columns)', async () => {
    let wideOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '120', // Wide terminal
        LINES: '30'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      wideOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const lines = wideOutput.split('\n');
    const fileLines = lines.filter(line => 
      line.includes('root-file.txt') || 
      line.includes('level2-file.txt') || 
      line.includes('deep-file.txt')
    );

    expect(fileLines.length, 'Should display files in wide terminal').toBeGreaterThan(2);

    // In wide terminal, should show more complete directory paths
    const hasDetailedPaths = fileLines.some(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      return cleanLine.includes('very/deep/nested') || 
             cleanLine.includes('directory/structure') ||
             cleanLine.length > 100; // Should use more space
    });

    expect(hasDetailedPaths, 'Should show more detailed paths in wide terminal').toBe(true);

    // Should maintain column structure
    expect(wideOutput).toMatch(/Modified.*Elapsed.*File Name.*Event.*Lines.*Blocks.*Directory/);
  }, 8000);

  test('should handle terminal resize during runtime (SIGWINCH)', async () => {
    let resizeOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '80',
        LINES: '24'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      resizeOutput += data.toString();
    });

    // Wait for initial startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create new file to ensure there's activity
    fs.writeFileSync(path.join(testDir, 'resize-test.txt'), 'before resize');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate terminal resize by sending SIGWINCH
    cctopProcess.kill('SIGWINCH');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create another file after resize
    fs.writeFileSync(path.join(testDir, 'after-resize.txt'), 'after resize');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // FUNC-204 Requirement: Immediate re-layout on window size change
    const hasFiles = resizeOutput.includes('resize-test.txt') && 
                     resizeOutput.includes('after-resize.txt');
    
    expect(hasFiles, 'Should display files before and after resize').toBe(true);

    // Should maintain proper display structure after resize
    expect(resizeOutput).toMatch(/Modified.*File Name.*Directory/);
    
    // Process should not crash from resize signal
    expect(cctopProcess.killed, 'Process should survive terminal resize').toBe(false);
  }, 10000);

  test('should preserve important directory parts with tail-priority truncation', async () => {
    // Create very deep directory structure
    const veryDeepDir = path.join(testDir, 'extremely', 'long', 'path', 'with', 'many', 'segments', 'that', 'should', 'be', 'truncated', 'but', 'preserve', 'important', 'ending');
    fs.mkdirSync(veryDeepDir, { recursive: true });
    
    fs.writeFileSync(path.join(veryDeepDir, 'important-file.txt'), 'in deep directory');

    let truncationOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '90', // Medium width to force truncation
        LINES: '24'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      truncationOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const lines = truncationOutput.split('\n');
    const deepFileLine = lines.find(line => line.includes('important-file.txt'));
    
    expect(deepFileLine, 'Should find file in deep directory').toBeDefined();

    if (deepFileLine) {
      // FUNC-204 Requirement: Tail-priority truncation
      const hasImportantParts = 
        deepFileLine.includes('important') || 
        deepFileLine.includes('ending') ||
        deepFileLine.includes('preserve') ||
        deepFileLine.includes('...'); // Ellipsis for truncation

      expect(hasImportantParts, 'Should preserve important directory parts').toBe(true);

      // Should not show the full extremely long path
      const showsFullPath = deepFileLine.includes('extremely/long/path/with/many/segments/that/should/be/truncated');
      expect(showsFullPath, 'Should not show full extremely long path').toBe(false);
    }
  }, 8000);

  test('should maintain fixed column widths while adjusting directory column', async () => {
    let columnOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '100',
        LINES: '25'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      columnOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const lines = columnOutput.split('\n');
    const headerLine = lines.find(line => 
      line.includes('Modified') && 
      line.includes('Elapsed') && 
      line.includes('File Name')
    );

    expect(headerLine, 'Should have column header').toBeDefined();

    if (headerLine) {
      // FUNC-204 Requirement: Fixed column widths maintained
      const modifiedPos = headerLine.indexOf('Modified');
      const elapsedPos = headerLine.indexOf('Elapsed');
      const fileNamePos = headerLine.indexOf('File Name');
      const eventPos = headerLine.indexOf('Event');
      const directoryPos = headerLine.indexOf('Directory');

      expect(modifiedPos).toBe(0); // Modified starts at beginning
      expect(elapsedPos).toBeGreaterThan(modifiedPos);
      expect(fileNamePos).toBeGreaterThan(elapsedPos);
      expect(eventPos).toBeGreaterThan(fileNamePos);
      expect(directoryPos).toBeGreaterThan(eventPos); // Directory is rightmost

      // Fixed columns should maintain their relative positions
      const fileLines = lines.filter(line => 
        line.includes('root-file.txt') || line.includes('level2-file.txt')
      );

      if (fileLines.length >= 2) {
        const eventPositions = fileLines.map(line => {
          const match = line.match(/(create|find|modify)/);
          return match ? match.index : -1;
        }).filter(pos => pos > 0);

        if (eventPositions.length >= 2) {
          const positionVariance = Math.max(...eventPositions) - Math.min(...eventPositions);
          expect(positionVariance, 'Event column should maintain consistent position').toBeLessThan(3);
        }
      }
    }
  }, 8000);

  test('should handle minimum directory column width gracefully', async () => {
    let minWidthOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        COLUMNS: '70', // Very narrow terminal
        LINES: '20'
      }
    });

    cctopProcess.stdout.on('data', (data) => {
      minWidthOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Even with very narrow terminal, should maintain basic functionality
    expect(minWidthOutput).toMatch(/root-file\.txt/);
    expect(minWidthOutput).toMatch(/Modified.*File Name/);

    // Should show at least minimal directory information
    const hasDirectoryCol = minWidthOutput.includes('./') || 
                           minWidthOutput.includes('very/') ||
                           minWidthOutput.includes('Directory');
    
    expect(hasDirectoryCol, 'Should show minimal directory info even in narrow terminal').toBe(true);

    // Should not break the display completely
    const lines = minWidthOutput.split('\n');
    const brokenLines = lines.filter(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      return cleanLine.length > 75; // Should respect narrow width
    });

    expect(brokenLines.length, 'Should not have many lines exceeding narrow width').toBeLessThan(3);
  }, 8000);
});

/**
 * Responsive Display Analysis Helper
 * Analyzes terminal responsiveness and FUNC-204 compliance
 */
export class ResponsiveDisplayAnalyzer {
  static measureColumnWidths(headerLine) {
    const columnPositions = {
      modified: headerLine.indexOf('Modified'),
      elapsed: headerLine.indexOf('Elapsed'),
      fileName: headerLine.indexOf('File Name'),
      event: headerLine.indexOf('Event'),
      lines: headerLine.indexOf('Lines'),
      blocks: headerLine.indexOf('Blocks'),
      directory: headerLine.indexOf('Directory')
    };

    return columnPositions;
  }

  static analyzeDirectoryTruncation(fileLine, expectedPath) {
    const preservesImportant = expectedPath.split('/').slice(-2).some(segment => 
      fileLine.includes(segment)
    );
    
    const showsFullPath = fileLine.includes(expectedPath);
    const hasEllipsis = fileLine.includes('...');

    return {
      preservesImportant,
      showsFullPath,
      hasEllipsis,
      appropriateTruncation: preservesImportant && !showsFullPath
    };
  }

  static validateTerminalResize(beforeOutput, afterOutput) {
    const beforeLines = beforeOutput.split('\n');
    const afterLines = afterOutput.split('\n');

    return {
      maintainsStructure: afterLines.some(line => 
        line.includes('Modified') && line.includes('File Name')
      ),
      showsNewContent: afterOutput.length > beforeOutput.length,
      noDisplayCorruption: afterLines.every(line => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        return cleanLine.length < 200; // Reasonable line length
      })
    };
  }

  static validateFUNC204Compliance(output, terminalWidth) {
    const lines = output.split('\n');
    const headerLine = lines.find(line => 
      line.includes('Modified') && line.includes('Directory')
    );

    if (!headerLine) return { compliant: false, reason: 'No header found' };

    const columnWidths = this.measureColumnWidths(headerLine);
    const expectedFixedWidth = 88; // FUNC-204 specification
    const expectedDirectoryWidth = Math.max(10, terminalWidth - expectedFixedWidth - 2);

    return {
      compliant: true,
      hasResponsiveDirectory: columnWidths.directory > 0,
      maintainsFixedColumns: Object.values(columnWidths).every(pos => pos >= 0),
      appropriateWidth: lines.every(line => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        return cleanLine.length <= terminalWidth + 10; // Allow small margin
      })
    };
  }
}
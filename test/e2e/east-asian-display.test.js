/**
 * FUNC-200: East Asian Width Display End-to-End Test
 * Tests actual display of Japanese, Chinese, Korean characters in file names
 * 
 * FUNC-200 Requirements:
 * - Half-width (1 width) and full-width (2 width) accurate calculation
 * - File name column width adjustment and padding
 * - Ellipsis (...) truncation for width overflow
 * - Unified width processing across all columns
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-200: East Asian Width Display', () => {
  let testDir;
  let cctopProcess;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = `/tmp/cctop-eastasian-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
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

  test('should correctly display Japanese file names with proper alignment', async () => {
    // Create files with Japanese names
    const japaneseFiles = [
      'テスト.txt',           // Test (Katakana)
      'ファイル.js',          // File (Katakana)
      '設定.json',           // Settings (Kanji)
      'データベース.db',      // Database (Katakana)
      '重要文書.md'          // Important Document (Kanji)
    ];

    japaneseFiles.forEach(fileName => {
      fs.writeFileSync(path.join(testDir, fileName), 'テスト内容');
    });

    let outputBuffer = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    // Wait for files to be processed and displayed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FUNC-200 Requirement: Accurate width calculation for Japanese
    japaneseFiles.forEach(fileName => {
      expect(outputBuffer).toMatch(new RegExp(fileName));
    });

    // Check column alignment with Japanese text
    const lines = outputBuffer.split('\n');
    const japaneseLines = lines.filter(line => 
      japaneseFiles.some(name => line.includes(name))
    );

    expect(japaneseLines.length, 'Should display all Japanese file names').toBeGreaterThan(3);

    // Verify alignment by checking consistent column positions
    const eventColumnPositions = japaneseLines.map(line => {
      const eventMatch = line.match(/(create|find|modify)/);
      return eventMatch ? eventMatch.index : -1;
    }).filter(pos => pos > 0);

    if (eventColumnPositions.length > 1) {
      const positionVariance = Math.max(...eventColumnPositions) - Math.min(...eventColumnPositions);
      expect(positionVariance, 'Event column should be aligned despite Japanese text').toBeLessThan(5);
    }
  }, 8000);

  test('should handle mixed language file names correctly', async () => {
    // Create files with mixed languages
    const mixedFiles = [
      'test-テスト.txt',        // English + Japanese
      'config-设置.json',       // English + Chinese
      'data-데이터.csv',        // English + Korean
      'file_ファイル_混合.md',  // English + Japanese + Kanji
      'プロジェクト-project.js' // Japanese + English
    ];

    mixedFiles.forEach(fileName => {
      fs.writeFileSync(path.join(testDir, fileName), 'mixed content');
    });

    let displayOutput = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      displayOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // All mixed language files should be displayed
    mixedFiles.forEach(fileName => {
      expect(displayOutput, `Should display mixed file: ${fileName}`).toMatch(new RegExp(fileName));
    });

    // Check that display is not corrupted by mixed characters
    const lines = displayOutput.split('\n');
    const fileLines = lines.filter(line => 
      mixedFiles.some(name => line.includes(name))
    );

    // Each file line should have proper structure
    fileLines.forEach(line => {
      // Should have timestamp, filename, event type, etc.
      expect(line).toMatch(/\d{4}-\d{2}-\d{2}.*\d{2}:\d{2}:\d{2}/); // Timestamp
      expect(line).toMatch(/(create|find|modify|delete)/); // Event type
    });
  }, 10000);

  test('should truncate long East Asian file names with ellipsis', async () => {
    // Create files with very long Japanese names
    const longJapaneseFiles = [
      'とても長いファイル名前です本当に長いです.txt',
      '非常に長い日本語のファイル名前でございます文書.md',
      '超長いファイル名前テストケースです本当に長いファイル名前.json'
    ];

    longJapaneseFiles.forEach(fileName => {
      fs.writeFileSync(path.join(testDir, fileName), 'long name content');
    });

    let truncationOutput = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      truncationOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // FUNC-200 Requirement: Ellipsis truncation for width overflow
    const lines = truncationOutput.split('\n');
    const longNameLines = lines.filter(line => 
      /とても|非常に|超長い/.test(line)
    );

    expect(longNameLines.length, 'Should display long Japanese file names').toBeGreaterThan(2);

    // Check for ellipsis truncation
    const hasEllipsis = longNameLines.some(line => line.includes('...'));
    expect(hasEllipsis, 'Should truncate long names with ellipsis').toBe(true);

    // Verify that lines don't exceed reasonable width
    longNameLines.forEach(line => {
      // Remove ANSI color codes for accurate length check
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      expect(cleanLine.length, 'Line should not exceed terminal width').toBeLessThan(120);
    });
  }, 8000);

  test('should maintain column structure with emoji and special characters', async () => {
    // Create files with emoji and special East Asian characters
    const emojiFiles = [
      '📁フォルダ.txt',
      '🎌日本.md',
      '🇯🇵ジャパン.json',
      '♨️温泉.csv',
      '🗾列島.js'
    ];

    emojiFiles.forEach(fileName => {
      fs.writeFileSync(path.join(testDir, fileName), 'emoji content');
    });

    let emojiOutput = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      emojiOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Files with emoji should be displayed (FUNC-200 notes emoji as partial support)
    const hasEmojiFiles = emojiFiles.some(fileName => 
      emojiOutput.includes(fileName) || emojiOutput.includes('フォルダ') || emojiOutput.includes('日本')
    );

    // Even if emoji support is partial, Japanese text should display correctly
    expect(emojiOutput).toMatch(/フォルダ|日本|ジャパン|温泉|列島/);

    // Column structure should not be completely broken
    expect(emojiOutput).toMatch(/Event Timestamp.*Elapsed.*File Name.*Event/);
  }, 10000);

  test('should handle width calculation correctly in different terminal sizes', async () => {
    // Test with narrow terminal
    let narrowOutput = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', COLUMNS: '80', LINES: '24' }
    });

    // Create test files
    fs.writeFileSync(path.join(testDir, '日本語テスト.txt'), 'narrow test');
    fs.writeFileSync(path.join(testDir, 'english-test.txt'), 'narrow test');

    cctopProcess.stdout.on('data', (data) => {
      narrowOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Terminate and test with wide terminal
    cctopProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));

    let wideOutput = '';
    
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', COLUMNS: '120', LINES: '30' }
    });

    cctopProcess.stdout.on('data', (data) => {
      wideOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Both outputs should show Japanese correctly
    expect(narrowOutput).toMatch(/日本語テスト/);
    expect(wideOutput).toMatch(/日本語テスト/);

    // Both should maintain column structure
    expect(narrowOutput).toMatch(/Event Timestamp.*File Name/);
    expect(wideOutput).toMatch(/Event Timestamp.*File Name/);

    // Wide terminal should have more space for directory column
    const narrowLines = narrowOutput.split('\n');
    const wideLines = wideOutput.split('\n');
    
    // At least one of them should show proper display
    const hasProperDisplay = narrowLines.length > 5 || wideLines.length > 5;
    expect(hasProperDisplay, 'Should display content in either terminal size').toBe(true);
  }, 15000);
});

/**
 * East Asian Width Analysis Helper
 * Analyzes display correctness for East Asian characters
 */
export class EastAsianDisplayAnalyzer {
  static calculateDisplayWidth(text) {
    // Simplified width calculation for testing
    let width = 0;
    for (const char of text) {
      // East Asian characters typically take 2 columns
      if (char.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  static extractFileNameLines(output) {
    const lines = output.split('\n');
    return lines.filter(line => 
      line.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/) && // Contains East Asian
      line.match(/\d{4}-\d{2}-\d{2}/) // Contains timestamp
    );
  }

  static validateAlignment(lines) {
    // Check if event column positions are consistent
    const eventPositions = lines.map(line => {
      const match = line.match(/(create|find|modify|delete)/);
      return match ? match.index : -1;
    }).filter(pos => pos > 0);

    if (eventPositions.length < 2) return true;

    const variance = Math.max(...eventPositions) - Math.min(...eventPositions);
    return variance < 5; // Allow small variance
  }

  static checkTruncation(lines) {
    return {
      hasEllipsis: lines.some(line => line.includes('...')),
      exceedsWidth: lines.some(line => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        return cleanLine.length > 120;
      }),
      properTruncation: lines.filter(line => line.includes('...')).length > 0
    };
  }
}
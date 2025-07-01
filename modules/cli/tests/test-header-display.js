#!/usr/bin/env node

/**
 * Test header display formatting
 */

const path = require('path');
const { execSync } = require('child_process');

async function testHeaderDisplay() {
  console.log('Testing Header Display...');
  
  try {
    // Build first
    execSync('npm run build', { 
      cwd: path.join(__dirname, 'modules/cli'),
      stdio: 'pipe' 
    });

    // Import class
    const { BlessedColumnUI } = require('./modules/cli/dist/ui/blessed-column-ui.js');

    // Mock database
    const mockDb = {
      async getLatestEvents() { return []; }
    };

    // Test different column width configurations
    const testConfigs = [
      {
        name: 'Default',
        columnWidths: {
          timestamp: 20, elapsed: 10, filename: 25, 
          event: 10, lines: 8, blocks: 8, directory: 20
        }
      },
      {
        name: 'Wide filename',
        columnWidths: {
          timestamp: 18, elapsed: 8, filename: 35, 
          event: 12, lines: 6, blocks: 6, directory: 25
        }
      },
      {
        name: 'Compact',
        columnWidths: {
          timestamp: 16, elapsed: 8, filename: 20, 
          event: 8, lines: 6, blocks: 6, directory: 18
        }
      }
    ];

    testConfigs.forEach(config => {
      console.log(`\n${config.name} Configuration:`);
      console.log('Column Widths:', config.columnWidths);
      
      // Calculate total width
      const totalWidth = Object.values(config.columnWidths).reduce((a, b) => a + b, 0) + 6; // +6 for separators
      console.log('Total Width:', totalWidth);
      
      // Show expected header layout
      const padToWidth = (text, width) => {
        if (text.length >= width) return text.substring(0, width - 1);
        const padding = width - text.length;
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      };
      
      const headers = ['Timestamp', 'Elapsed', 'File Name', 'Event', 'Lines', 'Blocks', 'Directory'];
      const widths = [
        config.columnWidths.timestamp,
        config.columnWidths.elapsed,
        config.columnWidths.filename,
        config.columnWidths.event,
        config.columnWidths.lines,
        config.columnWidths.blocks,
        config.columnWidths.directory
      ];
      
      const headerRow = headers.map((header, i) => padToWidth(header, widths[i])).join('│');
      console.log('Header Preview:');
      console.log('┌' + widths.map(w => '─'.repeat(w)).join('┬') + '┐');
      console.log('│' + headerRow + '│');
      console.log('├' + widths.map(w => '─'.repeat(w)).join('┼') + '┤');
      console.log('│' + widths.map(w => ' '.repeat(w)).join('│') + '│');
      console.log('└' + widths.map(w => '─'.repeat(w)).join('┴') + '┘');
    });

    console.log('\n✅ Header formatting tests completed');
    console.log('\nNote: The actual UI will display each column as a separate blessed.js panel');
    console.log('      with borders, so the visual separation will be more clear.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testHeaderDisplay();
}
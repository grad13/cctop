/**
 * event-table-demo
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */
#!/usr/bin/env node
/**
 * EventTable Visual Demo
 * 
 * Run this to see actual rendering:
 * npm run build && node dist/tests/manual/event-table-demo.js
 */

import blessed from 'blessed';
import { EventTable } from '../../src/ui/components/EventTable/EventTable';
import { EventRow } from '../../src/types/event-row';

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'EventTable Demo'
});

// Sample data
const sampleEvents: EventRow[] = [
  {
    id: 1,
    timestamp: Date.now() - 300000, // 5 minutes ago
    filename: 'index.js',
    directory: '/project/src',
    event_type: 'create',
    size: 2048,
    lines: 50,
    blocks: 4,
    inode: 12345,
    elapsed_ms: 300000
  },
  {
    id: 2,
    timestamp: Date.now() - 120000, // 2 minutes ago
    filename: 'very-long-filename-that-should-be-truncated-with-ellipsis.test.js',
    directory: '/very/long/path/to/project/that/should/be/truncated/from/beginning',
    event_type: 'modify',
    size: 1024 * 1024 * 1.5, // 1.5MB
    lines: 1500,
    blocks: 12,
    inode: 12346,
    elapsed_ms: 120000
  },
  {
    id: 3,
    timestamp: Date.now() - 60000, // 1 minute ago
    filename: 'README.md',
    directory: '/docs',
    event_type: 'delete',
    size: 4096,
    lines: 120,
    blocks: 8,
    inode: 12347,
    elapsed_ms: 60000
  },
  {
    id: 4,
    timestamp: Date.now() - 30000, // 30 seconds ago
    filename: 'package.json',
    directory: '/project',
    event_type: 'move',
    size: 1536,
    lines: 45,
    blocks: 4,
    inode: 12348,
    elapsed_ms: 30000
  },
  {
    id: 5,
    timestamp: Date.now() - 5000, // 5 seconds ago
    filename: '日本語ファイル.txt',
    directory: '/ユーザー/プロジェクト',
    event_type: 'find',
    size: 512,
    lines: 20,
    blocks: 1,
    inode: 12349,
    elapsed_ms: 5000
  }
];

// Create EventTable
const eventTable = new EventTable({
  parent: screen,
  top: 3,
  left: 0,
  width: '100%',
  height: '100%-5',
  style: {
    fg: 'white',
    bg: 'transparent'
  }
}, screen.width);

// Add header
const headerBox = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: eventTable.getHeader(),
  tags: true,
  style: {
    fg: 'white',
    bg: 'transparent'
  }
});

// Add status line
const statusBox = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 1,
  content: '{center}Press j/k to move selection, q to quit{/center}',
  tags: true,
  style: {
    fg: 'white',
    bg: 'blue'
  }
});

// Selection state
let selectedIndex = 0;

// Initial render
eventTable.render(sampleEvents, selectedIndex);

// Key bindings
screen.key(['j', 'down'], () => {
  if (selectedIndex < sampleEvents.length - 1) {
    selectedIndex++;
    eventTable.render(sampleEvents, selectedIndex);
    screen.render();
  }
});

screen.key(['k', 'up'], () => {
  if (selectedIndex > 0) {
    selectedIndex--;
    eventTable.render(sampleEvents, selectedIndex);
    screen.render();
  }
});

screen.key(['q', 'C-c'], () => {
  process.exit(0);
});

// Handle resize
screen.on('resize', () => {
  eventTable.updateScreenWidth(screen.width);
  headerBox.setContent(eventTable.getHeader());
  eventTable.render(sampleEvents, selectedIndex);
  screen.render();
});

// Initial render
screen.render();

// Demo different scenarios every 3 seconds
let demoPhase = 0;
setInterval(() => {
  demoPhase++;
  
  switch (demoPhase % 4) {
    case 0:
      // Add new event
      const newEvent: EventRow = {
        id: sampleEvents.length + 1,
        timestamp: Date.now(),
        filename: `new-file-${Date.now()}.js`,
        directory: '/dynamic',
        event_type: 'create',
        size: Math.floor(Math.random() * 10000),
        lines: Math.floor(Math.random() * 100),
        blocks: 4,
        inode: 20000 + demoPhase,
        elapsed_ms: 0
      };
      sampleEvents.unshift(newEvent);
      if (sampleEvents.length > 10) sampleEvents.pop();
      break;
      
    case 1:
      // Change selection
      selectedIndex = (selectedIndex + 1) % sampleEvents.length;
      break;
      
    case 2:
      // Update existing event
      if (sampleEvents[1]) {
        sampleEvents[1].size += 1024;
        sampleEvents[1].lines += 10;
      }
      break;
  }
  
  eventTable.render(sampleEvents, selectedIndex);
  screen.render();
}, 3000);

console.log('EventTable Demo started. Press q to quit.');
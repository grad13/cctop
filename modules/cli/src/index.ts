#!/usr/bin/env node

/**
 * Beautiful CCTOP CLI - Entry Point
 * Features beautiful blessed.js UI with themes, icons, and responsive layout
 */

import { SimpleUI } from './simple-ui';
import { EventData } from './types';

// Mock event data for demonstration
const mockEvents: EventData[] = [
  {
    id: 1,
    timestamp: '2025-01-07 10:30:15',
    elapsed: '0.001s',
    filename: 'src/components/Header.tsx',
    event: 'create',
    lines: 45,
    blocks: 2,
    directory: 'src/components'
  },
  {
    id: 2,
    timestamp: '2025-01-07 10:30:16',
    elapsed: '0.002s',
    filename: 'src/styles/theme.css',
    event: 'modify',
    lines: 120,
    blocks: 5,
    directory: 'src/styles'
  },
  {
    id: 3,
    timestamp: '2025-01-07 10:30:18',
    elapsed: '0.001s',
    filename: 'docs/README.md',
    event: 'modify',
    lines: 89,
    blocks: 3,
    directory: 'docs'
  },
  {
    id: 4,
    timestamp: '2025-01-07 10:30:20',
    elapsed: '0.003s',
    filename: 'src/utils/helpers.ts',
    event: 'delete',
    lines: 0,
    blocks: 0,
    directory: 'src/utils'
  },
  {
    id: 5,
    timestamp: '2025-01-07 10:30:22',
    elapsed: '0.002s',
    filename: 'config/webpack.config.js',
    event: 'find',
    lines: 156,
    blocks: 8,
    directory: 'config'
  },
  {
    id: 6,
    timestamp: '2025-01-07 10:30:25',
    elapsed: '0.001s',
    filename: 'src/components/Button.tsx',
    event: 'create',
    lines: 67,
    blocks: 3,
    directory: 'src/components'
  },
  {
    id: 7,
    timestamp: '2025-01-07 10:30:27',
    elapsed: '0.004s',
    filename: 'tests/unit/Button.test.tsx',
    event: 'create',
    lines: 134,
    blocks: 6,
    directory: 'tests/unit'
  },
  {
    id: 8,
    timestamp: '2025-01-07 10:30:30',
    elapsed: '0.002s',
    filename: 'package.json',
    event: 'modify',
    lines: 45,
    blocks: 2,
    directory: '.'
  },
  {
    id: 9,
    timestamp: '2025-01-07 10:30:33',
    elapsed: '0.001s',
    filename: 'src/types/index.ts',
    event: 'move',
    lines: 23,
    blocks: 1,
    directory: 'src/types'
  },
  {
    id: 10,
    timestamp: '2025-01-07 10:30:35',
    elapsed: '0.002s',
    filename: 'backup/old-config.json',
    event: 'restore',
    lines: 78,
    blocks: 4,
    directory: 'backup'
  }
];

function main() {
  console.log('🚀 Starting Simple CCTOP UI...');
  
  // Create Simple UI (table-based like previous implementation)
  const ui = new SimpleUI();

  // Add initial mock data
  ui.addEvents(mockEvents);

  // Simulate real-time events
  let eventId = 11;
  const simulateEvents = () => {
    const events = ['create', 'modify', 'delete', 'move', 'find', 'restore'] as const;
    const files = [
      'src/main.ts',
      'src/components/Layout.tsx', 
      'src/styles/main.css',
      'tests/integration/app.test.ts',
      'docs/api.md',
      'config/database.json',
      'scripts/build.sh',
      'assets/logo.png',
      '設定ファイル.json',
      'コンポーネント.tsx',
      'スタイル.css'
    ];
    const directories = [
      'src',
      'src/components',
      'src/styles', 
      'tests/integration',
      'docs',
      'config',
      'scripts',
      'assets'
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const randomDir = directories[Math.floor(Math.random() * directories.length)];
    
    const now = new Date();
    const mockEvent: EventData = {
      id: eventId++,
      timestamp: now.toLocaleString('sv-SE').replace('T', ' ').slice(0, 19),
      elapsed: `${(Math.random() * 0.01).toFixed(3)}s`,
      filename: randomFile,
      event: randomEvent,
      lines: randomEvent === 'delete' ? 0 : Math.floor(Math.random() * 200) + 1,
      blocks: randomEvent === 'delete' ? 0 : Math.floor(Math.random() * 10) + 1,
      directory: randomDir
    };

    ui.addEvent(mockEvent);
  };

  // Start simulation
  const intervalId = setInterval(simulateEvents, 2000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    ui.destroy();
    console.log('\n👋 CCTOP UI closed gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    clearInterval(intervalId);
    ui.destroy();
    process.exit(0);
  });
}

// Run the application
if (require.main === module) {
  main();
}

export { SimpleUI } from './simple-ui';
export * from './types';
export * from './theme';
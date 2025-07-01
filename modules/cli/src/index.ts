/**
 * cctop CLI - Terminal UI for file monitoring
 */

import blessed from 'blessed';
import { Database, FileEvent } from '@cctop/shared';

const DB_PATH = '.cctop/data/activity.db';
const POLLING_INTERVAL = 100; // 100ms

async function main() {
  // Create blessed screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'cctop - Code Change Top'
  });

  // Create main box
  const box = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%-1',
    content: 'cctop v0.3.0 - Starting...',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  // Create status bar
  const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: 'Press q to quit',
    style: {
      fg: 'white',
      bg: 'blue'
    }
  });

  screen.append(box);
  screen.append(statusBar);

  // Quit on q key
  screen.key(['q', 'C-c'], () => {
    process.exit(0);
  });

  // Initialize database
  const db = new Database(DB_PATH);
  await db.connect();

  // Update display
  const updateDisplay = async () => {
    const events = await db.getRecentEvents(50);
    
    let content = '{bold}cctop v0.3.0{/bold} - File Activity Monitor\\n\\n';
    content += 'Recent Events:\\n';
    
    if (events.length === 0) {
      content += '\\nNo events yet...';
    } else {
      events.forEach(event => {
        content += `\\n${event.eventType}: ${event.filename}`;
      });
    }
    
    box.setContent(content);
    screen.render();
  };

  // Start polling
  setInterval(updateDisplay, POLLING_INTERVAL);
  
  // Initial update
  await updateDisplay();

  // Render the screen
  screen.render();
}

main().catch(console.error);
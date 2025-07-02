/**
 * cctop CLI - Terminal UI for file monitoring (v0.3.0 Console Version)
 */

import { Database, FileEvent } from '../../shared/dist/index';

const DB_PATH = '.cctop/data/activity.db';
const POLLING_INTERVAL = 1000; // 1 second for console version

async function main() {
  console.log('=== cctop v0.3.0 - File Activity Monitor ===\n');
  console.log('Console version - Press Ctrl+C to exit\n');

  // Initialize database
  const db = new Database(DB_PATH);
  try {
    await db.connect();
    console.log('✅ Database connected successfully\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Update display function
  const updateDisplay = async () => {
    try {
      const events = await db.getRecentEvents(20);
      
      // Clear screen and show header
      console.clear();
      console.log('=== cctop v0.3.0 - File Activity Monitor ===\n');
      console.log(`📊 Recent Events (${events.length})\n`);
      
      if (events.length === 0) {
        console.log('⏳ No events yet...\n');
      } else {
        events.forEach((event, i) => {
          const time = event.timestamp.toLocaleTimeString();
          const icon = getEventIcon(event.eventType);
          console.log(`${String(i + 1).padStart(2)}. [${time}] ${icon} ${event.eventType}: ${event.filename}`);
        });
        console.log('');
      }
      
      console.log('💡 Press Ctrl+C to exit');
      
    } catch (error) {
      console.error('❌ Error updating display:', error);
    }
  };

  // Helper function for event icons
  function getEventIcon(eventType: string): string {
    switch (eventType) {
      case 'create': return '✅';
      case 'modify': return '✏️';
      case 'delete': return '🗑️';
      case 'move': return '📁';
      default: return '📄';
    }
  }

  // Initial display
  await updateDisplay();
  
  // Start polling
  const interval = setInterval(updateDisplay, POLLING_INTERVAL);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down cctop CLI...');
    clearInterval(interval);
    await db.close();
    console.log('✅ Database closed');
    process.exit(0);
  });

  // Handle other termination signals
  process.on('SIGTERM', async () => {
    clearInterval(interval);
    await db.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('💥 CLI Error:', error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Simple CCTOP UI Demo (fallback for terminal compatibility issues)
 */

// Random data generator
class SimpleDataGenerator {
  constructor() {
    this.eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
    this.files = [
      'index.ts', 'app.js', 'config.json', 'README.md', 'package.json',
      'API設計書.md', 'メインスタイル.css', 'テストファイル.spec.js',
      'utils.ts', 'component.tsx', 'service.js', 'helper.ts'
    ];
    this.dirs = ['src', 'test', 'docs', 'config', 'utils', 'src/components'];
    this.eventCounter = 1;
  }

  generate() {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    const elapsed = this.randomElapsed();
    const filename = this.randomChoice(this.files);
    const eventType = this.randomChoice(this.eventTypes);
    const lines = Math.floor(Math.random() * 500) + 10;
    const blocks = Math.floor(lines / 20) + 1;
    const directory = this.randomChoice(this.dirs);

    return {
      timestamp,
      elapsed,
      filename,
      eventType,
      lines,
      blocks,
      directory
    };
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  randomElapsed() {
    const minutes = Math.floor(Math.random() * 5);
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

class SimpleUI {
  constructor() {
    this.generator = new SimpleDataGenerator();
    this.events = [];
    this.running = true;
    
    // Generate initial data
    for (let i = 0; i < 20; i++) {
      this.events.push(this.generator.generate());
    }
    
    this.setupKeyboard();
    this.start();
  }

  setupKeyboard() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === '\u0003') { // q or Ctrl+C
        this.cleanup();
        process.exit(0);
      } else if (key === ' ') {
        this.running = !this.running;
        this.render();
      }
    });
  }

  cleanup() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  colorize(text, color) {
    const colors = {
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      blue: '\x1b[34m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  formatEventType(type) {
    switch (type) {
      case 'create': return this.colorize(type, 'green');
      case 'modify': return this.colorize(type, 'yellow');
      case 'delete': return this.colorize(type, 'red');
      case 'find': return this.colorize(type, 'cyan');
      case 'move': return this.colorize(type, 'magenta');
      case 'restore': return this.colorize(type, 'blue');
      default: return type;
    }
  }

  truncate(text, length) {
    if (text.length <= length) return text.padEnd(length);
    return text.substring(0, length - 3) + '...';
  }

  render() {
    console.clear();
    
    // Header
    console.log(this.colorize('CCTOP - Code Change Monitor', 'bold'));
    console.log('─'.repeat(120));
    console.log(this.colorize('Timestamp    Elapsed File Name                     Event      Lines  Blocks Directory', 'bold'));
    console.log('─'.repeat(120));

    // Events
    this.events.slice(0, 20).forEach(event => {
      const line = [
        event.timestamp.padEnd(12),
        event.elapsed.padEnd(7),
        this.truncate(event.filename, 25),
        this.formatEventType(event.eventType).padEnd(15),
        event.lines.toString().padStart(5),
        event.blocks.toString().padStart(7),
        this.truncate(event.directory, 15)
      ].join(' ');
      console.log(line);
    });

    // Status bar
    console.log('─'.repeat(120));
    const status = this.running ? 
      this.colorize('● Status: RUNNING', 'green') : 
      this.colorize('● Status: STOPPED', 'red');
    console.log(`${status}  Mode: ALL     [space] Pause/Resume  [q] Exit`);
  }

  start() {
    this.render();
    
    setInterval(() => {
      if (this.running) {
        // Add new events
        this.events.unshift(this.generator.generate());
        this.events.unshift(this.generator.generate());
        
        // Keep only latest 25 events
        this.events = this.events.slice(0, 25);
        
        this.render();
      }
    }, 1500);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('exit', () => {
  console.log('\n\nThank you for using CCTOP!');
});

console.log('Starting CCTOP Simple UI Demo...');
console.log('Press [space] to pause/resume, [q] to quit\n');

new SimpleUI();
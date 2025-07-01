/**
 * CCTOP Blessed.js UI Demo
 * Simple JavaScript implementation for quick testing
 */

const blessed = require('blessed');

// Random data generator
class RandomDataGenerator {
  constructor() {
    this.eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
    this.fileExtensions = ['.ts', '.js', '.json', '.md', '.txt', '.css', '.html', '.py', '.java', '.cpp'];
    this.directories = [
      'src', 'test', 'docs', 'config', 'utils', 'components', 'pages', 'api', 'styles', 'assets',
      'src/components', 'src/utils', 'src/pages', 'test/unit', 'test/integration', 'docs/api'
    ];
    this.baseFilenames = [
      'index', 'app', 'main', 'config', 'utils', 'helper', 'component', 'service', 'controller',
      'package', 'README', 'CHANGELOG', 'test', 'spec'
    ];
    this.japaneseFiles = [
      'API設計書', '仕様書', 'メインスタイル', 'ユーティリティ', 'テストファイル', 'ドキュメント'
    ];
    this.eventCounter = 1;
  }

  generateEvents(count) {
    const events = [];
    for (let i = 0; i < count; i++) {
      events.push(this.generateSingleEvent());
    }
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  generateSingleEvent() {
    const now = Date.now();
    const randomTime = now - Math.random() * 300000; // Within last 5 minutes
    const timestamp = new Date(randomTime).toISOString();
    
    const filename = this.generateFilename();
    const directory = this.getRandomElement(this.directories);
    const eventType = this.getRandomElement(this.eventTypes);
    const size = this.generateFileSize(eventType);
    const lines = this.generateLineCount(size, filename);
    const blocks = Math.ceil(size / 4096);
    const inode = Math.floor(Math.random() * 1000000) + 100000;

    return {
      id: this.eventCounter++,
      timestamp,
      filename,
      directory,
      event_type: eventType,
      size,
      lines,
      blocks,
      inode
    };
  }

  generateFilename() {
    const useJapanese = Math.random() < 0.3;
    
    if (useJapanese) {
      const baseName = this.getRandomElement(this.japaneseFiles);
      const extension = this.getRandomElement(this.fileExtensions);
      return `${baseName}${extension}`;
    } else {
      const baseName = this.getRandomElement(this.baseFilenames);
      const extension = this.getRandomElement(this.fileExtensions);
      return `${baseName}${extension}`;
    }
  }

  generateFileSize(eventType) {
    switch (eventType) {
      case 'create': return Math.floor(Math.random() * 5000) + 100;
      case 'delete': return Math.floor(Math.random() * 50000) + 500;
      case 'modify': return Math.floor(Math.random() * 20000) + 200;
      default: return Math.floor(Math.random() * 10000) + 100;
    }
  }

  generateLineCount(size, filename) {
    const extension = filename.split('.').pop() || '';
    let avgCharsPerLine = 50;
    
    switch (extension) {
      case 'ts':
      case 'js': avgCharsPerLine = 60; break;
      case 'json': avgCharsPerLine = 30; break;
      case 'md': avgCharsPerLine = 80; break;
    }
    
    return Math.max(1, Math.floor(size / avgCharsPerLine));
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// Main UI class
class CCTOPTerminalUI {
  constructor() {
    this.dataGenerator = new RandomDataGenerator();
    this.events = [];
    this.selectedIndex = -1;
    this.isSelectionMode = false;
    this.isRunning = true;
    
    this.initializeScreen();
    this.setupComponents();
    this.setupKeyHandlers();
    this.start();
  }

  initializeScreen() {
    // Suppress blessed.js terminal errors
    const originalWrite = process.stderr.write;
    process.stderr.write = function(string, encoding, callback) {
      if (string.includes('Error on xterm') || string.includes('Setulc')) {
        return true; // Suppress color terminal errors
      }
      return originalWrite.call(process.stderr, string, encoding, callback);
    };

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - Code Change Monitor',
      fullUnicode: true,
      autoPadding: true,
      terminal: 'xterm', // Force compatible terminal type
      forceUnicode: false // Disable problematic unicode features
    });
  }

  setupComponents() {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{bold}Timestamp{/}    {bold}Elapsed{/} {bold}File Name{/}                     {bold}Event{/}    {bold}Lines{/}  {bold}Blocks{/} {bold}Directory{/}',
      style: { fg: 'white', bold: true },
      tags: true
    });

    // Main table
    this.table = blessed.listtable({
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-2',
      border: 'line',
      style: {
        header: { fg: 'white', bold: true },
        cell: { fg: 'white' }
      },
      align: 'left',
      pad: 1,
      scrollable: true,
      keys: true,
      vi: true,
      tags: true
    });

    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: { fg: 'green', bg: 'black' },
      tags: true
    });

    this.screen.append(this.headerBox);
    this.screen.append(this.table);
    this.screen.append(this.statusBar);
  }

  setupKeyHandlers() {
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['up', 'k'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateDisplay();
      }
    });

    this.screen.key(['down', 'j'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 1);
        this.updateDisplay();
      }
    });

    this.screen.key(['enter'], () => {
      if (this.isSelectionMode && this.selectedIndex >= 0) {
        this.showEventDetails();
      }
    });

    this.screen.key(['escape'], () => {
      if (this.isSelectionMode) {
        this.exitSelectionMode();
      }
    });

    this.screen.key(['space'], () => {
      this.togglePause();
    });
  }

  enterSelectionMode() {
    if (!this.isSelectionMode) {
      this.isSelectionMode = true;
      this.selectedIndex = 0;
      this.updateStatusBar();
    }
  }

  exitSelectionMode() {
    this.isSelectionMode = false;
    this.selectedIndex = -1;
    this.updateDisplay();
  }

  showEventDetails() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
      const event = this.events[this.selectedIndex];
      const content = `{bold}Event Details{/}

{cyan-fg}Timestamp:{/} ${new Date(event.timestamp).toLocaleString()}
{cyan-fg}File:{/} ${event.filename}
{cyan-fg}Event Type:{/} ${event.event_type}
{cyan-fg}Directory:{/} ${event.directory}
{cyan-fg}Lines:{/} ${event.lines || 'N/A'}
{cyan-fg}Blocks:{/} ${event.blocks || 'N/A'}
{cyan-fg}Size:{/} ${event.size} bytes

{gray-fg}Press Esc or q to close{/}`;

      const detailBox = blessed.box({
        top: 'center',
        left: 'center',
        width: '80%',
        height: '60%',
        border: 'line',
        style: { border: { fg: 'cyan' } },
        content: content,
        scrollable: true,
        keys: true,
        tags: true
      });

      detailBox.key(['escape', 'q'], () => {
        this.screen.remove(detailBox);
        this.screen.render();
      });

      this.screen.append(detailBox);
      detailBox.focus();
      this.screen.render();
    }
  }

  togglePause() {
    this.isRunning = !this.isRunning;
    this.updateStatusBar();
  }

  start() {
    this.refreshData();
    
    setInterval(() => {
      if (this.isRunning) {
        this.refreshData();
      }
    }, 1000);

    this.screen.render();
  }

  refreshData() {
    // Generate new events
    const newEvents = [
      this.dataGenerator.generateSingleEvent(),
      this.dataGenerator.generateSingleEvent(),
      this.dataGenerator.generateSingleEvent()
    ];
    
    // Keep last 22 events + 3 new ones = 25 total
    this.events = [...newEvents, ...this.events.slice(0, 22)];
    this.updateDisplay();
  }

  updateDisplay() {
    const data = this.formatTableData();
    this.table.setData(data);
    this.updateStatusBar();
    this.screen.render();
  }

  formatTableData() {
    const headers = ['Timestamp', 'Elapsed', 'File Name', 'Event', 'Lines', 'Blocks', 'Directory'];
    const rows = [headers];

    this.events.forEach((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleString().substring(11, 19);
      const elapsed = this.formatElapsed(event.timestamp);
      const filename = this.truncateText(event.filename, 25);
      const eventType = this.colorizeEventType(event.event_type);
      const lines = event.lines?.toString() || '';
      const blocks = event.blocks?.toString() || '';
      const directory = this.truncateText(event.directory, 15);

      const marker = (this.isSelectionMode && index === this.selectedIndex) ? '>>> ' : '';
      const row = [
        `${marker}${timestamp}`,
        elapsed,
        filename,
        eventType,
        lines,
        blocks,
        directory
      ];

      rows.push(row);
    });

    return rows;
  }

  formatElapsed(timestamp) {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    const diff = Math.floor((now - eventTime) / 1000);
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  colorizeEventType(eventType) {
    switch (eventType.toLowerCase()) {
      case 'find': return `{cyan-fg}${eventType}{/}`;
      case 'create': return `{green-fg}${eventType}{/}`;
      case 'modify': return `{yellow-fg}${eventType}{/}`;
      case 'delete': return `{red-fg}${eventType}{/}`;
      case 'move': return `{magenta-fg}${eventType}{/}`;
      case 'restore': return `{blue-fg}${eventType}{/}`;
      default: return eventType;
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  updateStatusBar() {
    const status = this.isRunning ? 'RUNNING' : 'STOPPED';
    const mode = this.isSelectionMode ? 'SELECT' : 'ALL';
    const eventCount = this.events.length;
    const totalCount = Math.floor(Math.random() * 50) + 150;
    
    const content = `{green-fg}● Status: ${status}{/}  Mode: ${mode}     All Activities (${eventCount}/${totalCount})     {cyan-fg}[a] All  [u] Unique  [d] Directory  [↑] Select  [Enter] Confirm  [Esc] Cancel  [space] Pause  [q] Exit{/}`;
    this.statusBar.setContent(content);
  }
}

// Check if blessed is available
try {
  new CCTOPTerminalUI();
} catch (error) {
  console.error('Error starting UI:', error.message);
  console.log('Make sure to install blessed: npm install blessed');
}
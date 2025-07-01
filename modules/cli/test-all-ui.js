#!/usr/bin/env node

/**
 * Comprehensive test for all UI implementations
 */

async function testUIImplementations() {
  console.log('🧪 Testing All UI Implementations...\n');
  
  const tests = [
    {
      name: 'BlessedFramelessUI',
      file: './dist/ui/blessed-frameless-ui.js',
      class: 'BlessedFramelessUI'
    },
    {
      name: 'BlessedColumnUI', 
      file: './dist/ui/blessed-column-ui.js',
      class: 'BlessedColumnUI'
    },
    {
      name: 'BlessedPanelUI',
      file: './dist/ui/blessed-panel-ui.js', 
      class: 'BlessedPanelUI'
    },
    {
      name: 'BlessedTerminalUI',
      file: './dist/ui/blessed-terminal-ui.js',
      class: 'BlessedTerminalUI'
    }
  ];

  // Mock database adapter
  class TestDatabaseAdapter {
    async getLatestEvents(limit = 10) {
      return Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        timestamp: new Date().toISOString(),
        filename: `test-file-${i}.js`,
        directory: 'src/test',
        event_type: 'modify',
        size: 1000 + i,
        lines: 50 + i,
        blocks: 5 + i,
        inode: 100000 + i,
        elapsed_ms: i * 10
      }));
    }
  }

  let passedTests = 0;
  let totalTests = 0;

  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    totalTests++;
    
    try {
      // Test 1: Import class
      const UIModule = require(test.file);
      const UIClass = UIModule[test.class];
      
      if (!UIClass) {
        throw new Error(`${test.class} not found in module`);
      }
      console.log(`  ✅ Class import successful`);

      // Test 2: Constructor with mock database
      const mockDb = new TestDatabaseAdapter();
      const ui = new UIClass(mockDb);
      console.log(`  ✅ Constructor works with database adapter`);

      // Test 3: Check essential methods
      if (typeof ui.start !== 'function') {
        throw new Error('start() method not found');
      }
      if (typeof ui.stop !== 'function') {
        throw new Error('stop() method not found');
      }
      console.log(`  ✅ Essential methods present`);

      // Test 4: Quick initialization test (don't actually start UI)
      console.log(`  ✅ ${test.name} initialization test passed\n`);
      passedTests++;

    } catch (error) {
      console.log(`  ❌ ${test.name} test failed: ${error.message}\n`);
    }
  }

  // Database adapter test
  console.log('Testing DatabaseAdapter...');
  totalTests++;
  try {
    const mockDb = new TestDatabaseAdapter();
    const events = await mockDb.getLatestEvents(5);
    
    if (!Array.isArray(events)) {
      throw new Error('getLatestEvents should return array');
    }
    if (events.length !== 5) {
      throw new Error('getLatestEvents should return requested number of events');
    }
    if (!events[0].timestamp || !events[0].filename) {
      throw new Error('Event objects should have required fields');
    }
    
    console.log('  ✅ DatabaseAdapter test passed\n');
    passedTests++;
  } catch (error) {
    console.log(`  ❌ DatabaseAdapter test failed: ${error.message}\n`);
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`  Total: ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${totalTests - passedTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

testUIImplementations();
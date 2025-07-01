#!/usr/bin/env node

/**
 * RDD (Running-Driven Development) Daily Verification Script
 * BP-001 Phase 5.1 RDD原則完全実装
 * 
 * Purpose: Prevent 90% blank screen bugs through daily real-world testing
 * Usage: npm run rdd-verify (should be run daily by developers)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class RDDVerificationRunner {
  constructor() {
    this.testDir = `/tmp/rdd-verification-${Date.now()}`;
    this.results = {
      startupTime: null,
      visualContent: false,
      realTimeUpdates: false,
      keyboardResponse: false,
      gracefulExit: false,
      errors: []
    };
  }

  async runDailyVerification() {
    console.log(chalk.bold.blue('🚀 RDD Daily Verification (BP-001 Phase 5.1)'));
    console.log(chalk.gray('Testing real user experience to prevent display bugs\n'));

    try {
      await this.setupTestEnvironment();
      await this.testInstantStartup();
      await this.testVisualContent();
      await this.testRealTimeUpdates();
      await this.testKeyboardControls();
      await this.testGracefulExit();
      
      this.reportResults();
    } catch (error) {
      this.results.errors.push(error.message);
      this.reportResults();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('📁 Setting up test environment...'));
    
    // Create test directory
    fs.mkdirSync(this.testDir, { recursive: true });
    
    // Create initial files
    fs.writeFileSync(path.join(this.testDir, 'sample.js'), 'console.log("test");');
    fs.writeFileSync(path.join(this.testDir, 'data.json'), '{"test": true}');
    fs.writeFileSync(path.join(this.testDir, 'README.md'), '# Test Project');
    
    console.log(chalk.green('✅ Test environment ready'));
  }

  async testInstantStartup() {
    console.log(chalk.yellow('⚡ Testing instant startup (0.1s requirement)...'));
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['src/main.js', '--dir', this.testDir], {
        cwd: path.resolve(__dirname, '../'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let firstOutputReceived = false;
      
      cctopProcess.stdout.once('data', (data) => {
        const responseTime = Date.now() - startTime;
        this.results.startupTime = responseTime;
        firstOutputReceived = true;
        
        // Check if we get visual content immediately
        const output = data.toString();
        this.results.visualContent = this.analyzeVisualContent(output);
        
        console.log(chalk.green(`✅ First output in ${responseTime}ms`));
        if (responseTime > 100) {
          console.log(chalk.yellow('⚠️  Startup time exceeds 0.1s target'));
        }
        
        // Keep process running for next tests
        this.currentProcess = cctopProcess;
        resolve();
      });

      // Timeout if no response
      setTimeout(() => {
        if (!firstOutputReceived) {
          cctopProcess.kill();
          reject(new Error('No output received within 2 seconds'));
        }
      }, 2000);
    });
  }

  analyzeVisualContent(output) {
    // Check for header presence
    const hasHeader = /Event Timestamp.*Elapsed.*File Name.*Event/.test(output);
    
    // Check for content density (not 90% blank)
    const lines = output.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const contentDensity = nonEmptyLines.length / Math.max(lines.length, 1);
    
    // Check for file content
    const hasFileContent = /sample\.js|data\.json|README\.md/.test(output) ||
                           /create|find|modify/.test(output);
    
    const isGoodVisualContent = hasHeader && contentDensity > 0.3 && hasFileContent;
    
    console.log(`   📊 Visual Analysis:`);
    console.log(`      Header: ${hasHeader ? '✅' : '❌'}`);
    console.log(`      Content density: ${(contentDensity * 100).toFixed(1)}% ${contentDensity > 0.3 ? '✅' : '❌'}`);
    console.log(`      File content: ${hasFileContent ? '✅' : '❌'}`);
    
    return isGoodVisualContent;
  }

  async testRealTimeUpdates() {
    console.log(chalk.yellow('🔄 Testing real-time file change detection...'));
    
    if (!this.currentProcess) {
      throw new Error('No active cctop process for real-time testing');
    }

    let outputBuffer = '';
    this.currentProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    // Wait for initial stabilization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new files and modifications
    fs.writeFileSync(path.join(this.testDir, 'new-file.txt'), 'new content');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    fs.appendFileSync(path.join(this.testDir, 'sample.js'), '\n// modified');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    fs.unlinkSync(path.join(this.testDir, 'README.md'));
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if changes appeared in output
    const hasNewFile = /new-file\.txt/.test(outputBuffer);
    const hasModification = /sample\.js.*modify/.test(outputBuffer);
    const hasDeletion = /README\.md.*delete/.test(outputBuffer);
    
    this.results.realTimeUpdates = hasNewFile && hasModification && hasDeletion;
    
    console.log(`   📝 Real-time Updates:`);
    console.log(`      New file detected: ${hasNewFile ? '✅' : '❌'}`);
    console.log(`      Modification detected: ${hasModification ? '✅' : '❌'}`);
    console.log(`      Deletion detected: ${hasDeletion ? '✅' : '❌'}`);
    
    if (this.results.realTimeUpdates) {
      console.log(chalk.green('✅ Real-time updates working'));
    } else {
      console.log(chalk.red('❌ Real-time updates failed'));
    }
  }

  async testKeyboardControls() {
    console.log(chalk.yellow('⌨️  Testing keyboard controls...'));
    
    if (!this.currentProcess) {
      throw new Error('No active cctop process for keyboard testing');
    }

    let outputBuffer = '';
    this.currentProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    // Test 'a' key (All mode)
    this.currentProcess.stdin.write('a');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Test 'u' key (Unique mode)  
    this.currentProcess.stdin.write('u');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check for mode switching indicators
    const hasModeSwitch = /All|Unique/.test(outputBuffer) ||
                         /all.*events|unique.*files/i.test(outputBuffer);
    
    this.results.keyboardResponse = hasModeSwitch;
    
    console.log(`   ⌨️  Keyboard Response: ${hasModeSwitch ? '✅' : '❌'}`);
    
    if (this.results.keyboardResponse) {
      console.log(chalk.green('✅ Keyboard controls responsive'));
    } else {
      console.log(chalk.yellow('⚠️  Keyboard controls unclear (may still work)'));
    }
  }

  async testGracefulExit() {
    console.log(chalk.yellow('🔚 Testing graceful exit...'));
    
    if (!this.currentProcess) {
      throw new Error('No active cctop process for exit testing');
    }

    return new Promise((resolve) => {
      this.currentProcess.on('exit', (code) => {
        this.results.gracefulExit = (code === 0 || code === null);
        
        console.log(`   🔚 Exit code: ${code} ${this.results.gracefulExit ? '✅' : '❌'}`);
        
        if (this.results.gracefulExit) {
          console.log(chalk.green('✅ Graceful exit successful'));
        } else {
          console.log(chalk.red('❌ Exit with error code'));
        }
        
        resolve();
      });

      // Send Ctrl+C equivalent
      this.currentProcess.kill('SIGINT');
      
      // Fallback timeout
      setTimeout(() => {
        if (!this.currentProcess.killed) {
          this.currentProcess.kill('SIGTERM');
          this.results.gracefulExit = false;
          resolve();
        }
      }, 2000);
    });
  }

  reportResults() {
    console.log('\n' + chalk.bold.blue('📊 RDD Daily Verification Results'));
    console.log(chalk.gray('=' * 50));
    
    // Startup Performance
    const startupStatus = this.results.startupTime <= 100 ? '✅' : 
                         this.results.startupTime <= 3000 ? '⚠️' : '❌';
    console.log(`Startup Time: ${this.results.startupTime}ms ${startupStatus}`);
    
    // Visual Content (Critical - prevents 90% blank bug)
    const visualStatus = this.results.visualContent ? '✅' : '❌';
    console.log(`Visual Content: ${visualStatus} ${!this.results.visualContent ? chalk.red.bold('CRITICAL FAILURE') : ''}`);
    
    // Feature Functionality
    console.log(`Real-time Updates: ${this.results.realTimeUpdates ? '✅' : '❌'}`);
    console.log(`Keyboard Response: ${this.results.keyboardResponse ? '✅' : '⚠️'}`);
    console.log(`Graceful Exit: ${this.results.gracefulExit ? '✅' : '❌'}`);
    
    // Overall Assessment
    const criticalFailures = [
      !this.results.visualContent,
      this.results.startupTime > 5000,
      !this.results.gracefulExit
    ].filter(Boolean).length;
    
    const overallStatus = criticalFailures === 0 ? 'PASS' : 
                         criticalFailures <= 1 ? 'PARTIAL' : 'FAIL';
    
    console.log('\n' + chalk.bold(`Overall Status: ${
      overallStatus === 'PASS' ? chalk.green(overallStatus) :
      overallStatus === 'PARTIAL' ? chalk.yellow(overallStatus) :
      chalk.red(overallStatus)
    }`));
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n' + chalk.red.bold('❌ Errors:'));
      this.results.errors.forEach(error => {
        console.log(chalk.red(`   • ${error}`));
      });
    }
    
    // Recommendations
    if (overallStatus !== 'PASS') {
      console.log('\n' + chalk.yellow.bold('💡 Recommendations:'));
      
      if (!this.results.visualContent) {
        console.log(chalk.yellow('   • URGENT: Fix display system - run visual-display-verification.test.js'));
      }
      if (this.results.startupTime > 3000) {
        console.log(chalk.yellow('   • Optimize startup performance'));
      }
      if (!this.results.realTimeUpdates) {
        console.log(chalk.yellow('   • Check file monitoring integration'));
      }
    }
    
    console.log('\n' + chalk.blue('📝 This verification should be run daily (BP-001 RDD principle)'));
  }

  async cleanup() {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill('SIGTERM');
    }
    
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new RDDVerificationRunner();
  runner.runDailyVerification().catch(error => {
    console.error(chalk.red.bold('RDD Verification Failed:'), error.message);
    process.exit(1);
  });
}

module.exports = RDDVerificationRunner;
/**
 * Common test setup for FUNC-105 integration tests
 * Shared utilities and setup/teardown logic
 */

import { LocalSetupInitializer } from '../../../src/config/local-setup-initializer';
import { ConfigLoader } from '../../../src/config/config-loader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TestContext {
  testDir: string;
  initializer: LocalSetupInitializer;
  configLoader: ConfigLoader;
}

export class Func105TestSetup {
  private testDir: string = '';

  createTestDirectory(): string {
    this.testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-integration-'));
    return this.testDir;
  }

  cleanupTestDirectory(): void {
    if (this.testDir && fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  setupTestContext(testDir: string): TestContext {
    // Clean up any existing .cctop directory in test directory
    const cctopPath = path.join(testDir, '.cctop');
    if (fs.existsSync(cctopPath)) {
      fs.rmSync(cctopPath, { recursive: true, force: true });
    }
    
    // Change to test directory
    process.chdir(testDir);
    
    return {
      testDir,
      initializer: new LocalSetupInitializer(),
      configLoader: new ConfigLoader()
    };
  }

  resetWorkingDirectory(): void {
    // Reset working directory to test directory
    process.chdir(__dirname);
  }

  // Helper methods for common verification patterns
  verifyDirectoryStructure(): void {
    expect(fs.existsSync('.cctop')).toBe(true);
    expect(fs.existsSync('.cctop/config')).toBe(true);
    expect(fs.existsSync('.cctop/data')).toBe(true);
    expect(fs.existsSync('.cctop/themes')).toBe(true);
  }

  verifyConfigFiles(): void {
    expect(fs.existsSync('.cctop/config/shared-config.json')).toBe(true);
    expect(fs.existsSync('.cctop/config/daemon-config.json')).toBe(true);
    expect(fs.existsSync('.cctop/config/cli-config.json')).toBe(true);
  }

  verifyThemeFiles(): void {
    expect(fs.existsSync('.cctop/themes/current-theme.json')).toBe(true);
    expect(fs.existsSync('.cctop/themes/default.json')).toBe(true);
  }

  createPartialStructure(paths: string[]): void {
    paths.forEach(dirPath => {
      fs.mkdirSync(dirPath, { recursive: true });
    });
  }

  createExistingConfig(configPath: string, content: any): void {
    fs.writeFileSync(configPath, JSON.stringify(content, null, 2));
  }

  readConfigFile(configPath: string): any {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Performance testing helper
  async measureInitializationTime(initializer: LocalSetupInitializer): Promise<number> {
    const start = Date.now();
    await initializer.initialize();
    const end = Date.now();
    return end - start;
  }

  // Error simulation helpers
  makeDirectoryReadOnly(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.chmodSync(dirPath, 0o444);
    }
  }

  restoreDirectoryPermissions(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.chmodSync(dirPath, 0o755);
    }
  }

  corruptFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'corrupted content');
    }
  }
}
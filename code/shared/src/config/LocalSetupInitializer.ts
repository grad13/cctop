/**
 * Local Setup Initializer
 * Handles automatic creation of .cctop/ directory structure and initial configuration
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import * as fs from 'fs';
import * as path from 'path';
import { DirectoryStructureCreator } from './DirectoryStructureCreator';
import { ConfigFactory } from './ConfigFactory';

export interface SetupResult {
  success: boolean;
  created: boolean;
  configPath: string;
  message: string;
}

export interface LocalSetupConfig {
  targetDirectory?: string;
  dryRun?: boolean;
}

export class LocalSetupInitializer {
  private readonly DEFAULT_DIRECTORY = '.cctop';
  private readonly directoryCreator = new DirectoryStructureCreator();
  private readonly configFactory = new ConfigFactory();

  async initialize(options: LocalSetupConfig = {}): Promise<SetupResult> {
    const targetDir = options.targetDirectory || process.cwd();
    const configPath = path.join(targetDir, this.DEFAULT_DIRECTORY);

    if (this.isInitialized(targetDir)) {
      return {
        success: true,
        created: false,
        configPath,
        message: `Configuration already exists at ${configPath}`
      };
    }

    if (options.dryRun) {
      return {
        success: true,
        created: false,
        configPath,
        message: this.generateDryRunMessage(configPath)
      };
    }

    try {
      this.directoryCreator.create(configPath);
      this.writeConfigurationFiles(configPath);
      this.writeGitIgnore(configPath);

      return {
        success: true,
        created: true,
        configPath,
        message: this.generateSuccessMessage(configPath)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize configuration: ${errorMessage}`);
    }
  }

  private writeConfigurationFiles(configPath: string): void {
    const configDir = path.join(configPath, 'config');
    const themesDir = path.join(configPath, 'themes');
    const defaultTheme = this.configFactory.createDefaultTheme();

    const configs = [
      { file: path.join(configDir, 'shared-config.json'), data: this.configFactory.createSharedConfig() },
      { file: path.join(configDir, 'daemon-config.json'), data: this.configFactory.createDaemonConfig() },
      { file: path.join(configDir, 'cli-config.json'), data: this.configFactory.createCliConfig() },
      { file: path.join(themesDir, 'default.json'), data: defaultTheme },
      { file: path.join(themesDir, 'high-contrast.json'), data: this.configFactory.createHighContrastTheme() },
      { file: path.join(themesDir, 'current-theme.json'), data: defaultTheme }
    ];

    for (const config of configs) {
      if (!fs.existsSync(config.file)) {
        fs.writeFileSync(config.file, JSON.stringify(config.data, null, 2), { mode: 0o644 });
      }
    }
  }

  private writeGitIgnore(configPath: string): void {
    const gitignorePath = path.join(configPath, '.gitignore');
    const gitignoreContent = `# cctop monitoring data
data/
logs/
cache/
runtime/
temp/

# User customizations
themes/custom/
`;

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent, { mode: 0o644 });
    }
  }

  private generateSuccessMessage(configPath: string): string {
    return `Created configuration in ${configPath}/
Configuration files:
  - ${configPath}/config/shared-config.json (common settings)
  - ${configPath}/config/daemon-config.json (daemon settings)
  - ${configPath}/config/cli-config.json (display settings)
  - ${configPath}/themes/current-theme.json (color theme)
Starting monitoring...`;
  }

  private generateDryRunMessage(configPath: string): string {
    return `Would create configuration structure at ${configPath}/
Directories: config/, themes/, data/, logs/, runtime/, temp/
Files: shared-config.json, daemon-config.json, cli-config.json, themes, .gitignore`;
  }

  isInitialized(targetDirectory?: string): boolean {
    const targetDir = targetDirectory || process.cwd();
    const configPath = path.join(targetDir, this.DEFAULT_DIRECTORY);
    const configDir = path.join(configPath, 'config');
    const requiredFiles = [
      'shared-config.json',
      'daemon-config.json',
      'cli-config.json'
    ];

    if (!fs.existsSync(configPath) || !fs.existsSync(configDir)) {
      return false;
    }

    return requiredFiles.every(file =>
      fs.existsSync(path.join(configDir, file))
    );
  }
}

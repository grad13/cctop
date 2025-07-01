import * as fs from 'fs/promises';
import * as path from 'path';
import { SharedConfig, CLIConfig } from '@cctop/shared';

export interface CLIConfiguration {
  shared: SharedConfig;
  cli: CLIConfig;
}

export async function loadConfiguration(configDir: string): Promise<CLIConfiguration> {
  const sharedConfigPath = path.join(configDir, 'shared-config.json');
  const cliConfigPath = path.join(configDir, 'cli-config.json');

  try {
    // Load shared configuration
    const sharedConfigContent = await fs.readFile(sharedConfigPath, 'utf-8');
    const sharedConfig: SharedConfig = JSON.parse(sharedConfigContent);

    // Load CLI configuration
    let cliConfig: CLIConfig;
    try {
      const cliConfigContent = await fs.readFile(cliConfigPath, 'utf-8');
      cliConfig = JSON.parse(cliConfigContent);
    } catch {
      // Use default CLI config if not found
      cliConfig = getDefaultCLIConfig();
      await fs.writeFile(cliConfigPath, JSON.stringify(cliConfig, null, 2));
    }

    return { shared: sharedConfig, cli: cliConfig };
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error}`);
  }
}

function getDefaultCLIConfig(): CLIConfig {
  return {
    display: {
      refreshRate: 100,
      maxRows: 1000,
      colorEnabled: true,
      theme: 'default'
    },
    polling: {
      interval: 100
    },
    interactive: {
      keyBindings: {
        quit: 'q',
        scrollUp: 'up',
        scrollDown: 'down',
        pageUp: 'pageup',
        pageDown: 'pagedown',
        home: 'home',
        end: 'end'
      }
    }
  };
}
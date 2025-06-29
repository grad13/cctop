/**
 * Configuration Saver
 * Handles saving configuration files with atomic writes and backups
 */

import * as fs from 'fs';
import * as path from 'path';
import { FullConfig } from '../types/ConfigTypes';

export class ConfigSaver {
  private debug: boolean;

  constructor() {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: FullConfig, configPath: string): Promise<void> {
    try {
      // Ensure directory exists
      const configDir = path.dirname(configPath);
      await fs.promises.mkdir(configDir, { recursive: true });
      
      // Atomic write with backup
      await this.atomicWrite(configPath, config);
      
      if (this.debug) {
        console.log(`💾 Configuration saved to: ${configPath}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Perform atomic write with backup
   */
  private async atomicWrite(filePath: string, config: FullConfig): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.backup`;
    
    try {
      // Create backup if file exists
      if (await this.fileExists(filePath)) {
        await fs.promises.copyFile(filePath, backupPath);
      }
      
      // Write to temp file
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(tempPath, content, 'utf8');
      
      // Atomic rename
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      await this.cleanupTempFile(tempPath);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up temp file
   */
  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.promises.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Create backup of configuration
   */
  async createBackup(configPath: string): Promise<string | null> {
    try {
      if (!await this.fileExists(configPath)) {
        return null;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${configPath}.backup-${timestamp}`;
      
      await fs.promises.copyFile(configPath, backupPath);
      
      if (this.debug) {
        console.log(`📋 Backup created: ${backupPath}`);
      }
      
      return backupPath;
    } catch (error: any) {
      console.warn(`Failed to create backup: ${error.message}`);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(configPath: string, backupPath: string): Promise<void> {
    try {
      if (!await this.fileExists(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      await fs.promises.copyFile(backupPath, configPath);
      
      if (this.debug) {
        console.log(`♻️  Restored from backup: ${backupPath}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to restore from backup: ${error.message}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(configPath: string): Promise<string[]> {
    try {
      const dir = path.dirname(configPath);
      const basename = path.basename(configPath);
      
      const files = await fs.promises.readdir(dir);
      const backups = files.filter(file => 
        file.startsWith(`${basename}.backup`)
      );
      
      return backups.map(file => path.join(dir, file));
    } catch {
      return [];
    }
  }

  /**
   * Clean old backups
   */
  async cleanOldBackups(configPath: string, keepCount: number = 5): Promise<void> {
    try {
      const backups = await this.listBackups(configPath);
      
      if (backups.length <= keepCount) {
        return;
      }
      
      // Sort by modification time
      const backupStats = await Promise.all(
        backups.map(async (backup) => ({
          path: backup,
          mtime: (await fs.promises.stat(backup)).mtime.getTime()
        }))
      );
      
      backupStats.sort((a, b) => b.mtime - a.mtime);
      
      // Remove old backups
      const toRemove = backupStats.slice(keepCount);
      await Promise.all(
        toRemove.map(backup => fs.promises.unlink(backup.path))
      );
      
      if (this.debug && toRemove.length > 0) {
        console.log(`🗑️  Removed ${toRemove.length} old backups`);
      }
    } catch (error: any) {
      console.warn(`Failed to clean old backups: ${error.message}`);
    }
  }
}
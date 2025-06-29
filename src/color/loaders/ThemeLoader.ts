/**
 * Theme File Loader
 * Handles theme file operations including loading, saving, and listing
 */

import fs = require('fs');
import path = require('path');
import { 
  ColorTheme, 
  ThemeInfo, 
  ThemeLoadResult,
  ThemeValidationResult 
} from '../types/ThemeTypes';

export class ThemeLoader {
  private themesDir: string;
  private currentThemeFile: string;

  constructor(configPath: string = '.cctop') {
    this.themesDir = path.join(configPath, 'themes');
    this.currentThemeFile = path.join(configPath, 'current-theme.json');
  }

  /**
   * Load a theme by name
   */
  async loadTheme(name: string): Promise<ColorTheme> {
    const themePath = path.join(this.themesDir, `${name}.json`);
    
    try {
      if (!fs.existsSync(themePath)) {
        throw new Error(`Theme "${name}" not found`);
      }

      const themeData = fs.readFileSync(themePath, 'utf8');
      const theme = JSON.parse(themeData);
      
      const validation = this.validateThemeStructure(theme);
      if (!validation.valid) {
        throw new Error(`Invalid theme structure: ${validation.errors.join(', ')}`);
      }

      return theme as ColorTheme;
    } catch (error) {
      return this.handleThemeLoadError(name, error as Error);
    }
  }

  /**
   * Save a theme to file
   */
  async saveTheme(theme: ColorTheme): Promise<void> {
    const themePath = path.join(this.themesDir, `${theme.name}.json`);
    
    try {
      // Ensure themes directory exists
      if (!fs.existsSync(this.themesDir)) {
        fs.mkdirSync(this.themesDir, { recursive: true });
      }

      // Validate before saving
      const validation = this.validateThemeStructure(theme);
      if (!validation.valid) {
        throw new Error(`Cannot save invalid theme: ${validation.errors.join(', ')}`);
      }

      // Add/update metadata
      theme.lastUpdated = new Date().toISOString();
      theme.version = theme.version || '1.0.0';

      fs.writeFileSync(themePath, JSON.stringify(theme, null, 2));
    } catch (error) {
      throw new Error(`Failed to save theme "${theme.name}": ${(error as Error).message}`);
    }
  }

  /**
   * List all available themes
   */
  async listAvailableThemes(): Promise<ThemeInfo[]> {
    try {
      if (!fs.existsSync(this.themesDir)) {
        return [];
      }

      const files = fs.readdirSync(this.themesDir);
      const themes: ThemeInfo[] = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          try {
            const themePath = path.join(this.themesDir, file);
            const themeData = fs.readFileSync(themePath, 'utf8');
            const theme = JSON.parse(themeData) as ColorTheme;
            
            themes.push({
              name: theme.name,
              description: theme.description || 'No description',
              version: theme.version || '1.0.0',
              lastUpdated: theme.lastUpdated || 'Unknown',
              author: theme.author
            });
          } catch {
            // Skip invalid theme files
            console.warn(`[ThemeLoader] Skipping invalid theme file: ${file}`);
          }
        }
      }

      return themes;
    } catch (error) {
      console.error('[ThemeLoader] Error listing themes:', error);
      return [];
    }
  }

  /**
   * Get the current active theme
   */
  async getCurrentTheme(): Promise<ColorTheme | null> {
    try {
      if (!fs.existsSync(this.currentThemeFile)) {
        return null;
      }

      const currentData = fs.readFileSync(this.currentThemeFile, 'utf8');
      const current = JSON.parse(currentData);
      
      if (current.theme) {
        return await this.loadTheme(current.theme);
      }
      
      return null;
    } catch (error) {
      console.error('[ThemeLoader] Error loading current theme:', error);
      return null;
    }
  }

  /**
   * Set the current active theme
   */
  async setCurrentTheme(name: string): Promise<void> {
    try {
      // Verify theme exists
      await this.loadTheme(name);
      
      const currentConfig = {
        theme: name,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.currentThemeFile, JSON.stringify(currentConfig, null, 2));
    } catch (error) {
      throw new Error(`Failed to set current theme: ${(error as Error).message}`);
    }
  }

  /**
   * Validate theme structure
   */
  private validateThemeStructure(theme: any): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!theme.name) {
      errors.push('Theme name is required');
    }
    if (!theme.colors) {
      errors.push('Theme colors object is required');
    }

    // Validate color structure if present
    if (theme.colors) {
      // Check for at least one color definition
      const hasColors = theme.colors.table || 
                       theme.colors.status_bar || 
                       theme.colors.general_keys || 
                       theme.colors.event_filters || 
                       theme.colors.message_area;
      
      if (!hasColors) {
        warnings.push('Theme has no color definitions');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Handle theme loading errors with fallback
   */
  private handleThemeLoadError(name: string, error: Error): ColorTheme {
    console.error(`[ThemeLoader] Failed to load theme "${name}":`, error.message);
    
    // Return minimal default theme matching ThemeColors structure
    return {
      name: 'default',
      description: 'Default fallback theme',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      colors: {
        table: {
          column_headers: 'white',
          row: {
            event_timestamp: 'gray',
            elapsed_time: 'gray',
            file_name: 'white',
            event_type: {
              find: 'cyan',
              create: 'green',
              modify: 'yellow',
              delete: 'red',
              move: 'magenta',
              restore: 'blue'
            },
            lines: 'cyan',
            blocks: 'yellow',
            directory: 'blue'
          }
        },
        status_bar: {
          label: 'white',
          count: 'green',
          separator: 'gray'
        },
        general_keys: {
          key_active: 'green',
          key_inactive: 'white',
          label_active: 'green',
          label_inactive: 'white'
        },
        event_filters: {
          key_active: 'green',
          key_inactive: 'white',
          label_active: 'green',
          label_inactive: 'white'
        },
        message_area: {
          prompt: 'yellow',
          label: 'white',
          status: 'cyan',
          pid: 'green',
          summary: 'white'
        }
      }
    };
  }
}
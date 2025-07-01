/**
 * Theme Initializer
 * Handles theme directory initialization and preset theme creation
 */

const fs = require('fs');
const path = require('path');

// Type-only imports
import type { ThemeData } from '../../types';

// Import preset themes
import {
  getDefaultTheme,
  getHighContrastTheme,
  getColorfulTheme,
  getMinimalTheme
} from './theme-presets';

interface PresetThemes {
  [themeName: string]: ThemeData;
}

export class ThemeInitializer {
  private configPath: string;
  private themesDir: string;

  constructor(configPath: string = '.cctop') {
    this.configPath = configPath;
    this.themesDir = path.join(configPath, 'themes');
  }

  /**
   * Initialize themes directory and create preset themes
   */
  async initialize(): Promise<boolean> {
    try {
      // Create themes directory if it doesn't exist
      if (!fs.existsSync(this.themesDir)) {
        fs.mkdirSync(this.themesDir, { recursive: true });
        
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`[ThemeInitializer] Created themes directory: ${this.themesDir}`);
        }
      }
      
      // Create preset themes
      await this.createPresetThemes();
      
      return true;
    } catch (error: any) {
      console.error(`[ThemeInitializer] Error initializing themes: ${error.message}`);
      return false;
    }
  }

  /**
   * Create all preset theme files
   */
  private async createPresetThemes(): Promise<void> {
    const presetThemes: PresetThemes = {
      'default': getDefaultTheme(),
      'high-contrast': getHighContrastTheme(),
      'colorful': getColorfulTheme(),
      'minimal': getMinimalTheme()
    };

    for (const [themeName, themeData] of Object.entries(presetThemes)) {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      
      try {
        // Only create if file doesn't exist (don't overwrite user modifications)
        if (!fs.existsSync(themeFile)) {
          fs.writeFileSync(themeFile, JSON.stringify(themeData, null, 2));
          
          if (process.env.CCTOP_VERBOSE === 'true') {
            console.log(`[ThemeInitializer] Created preset theme: ${themeName}`);
          }
        }
      } catch (error: any) {
        console.warn(`[ThemeInitializer] Error creating theme ${themeName}: ${error.message}`);
      }
    }
  }

  /**
   * Check if themes directory exists and is properly initialized
   */
  isInitialized(): boolean {
    if (!fs.existsSync(this.themesDir)) {
      return false;
    }

    // Check if at least default theme exists
    const defaultThemeFile = path.join(this.themesDir, 'default.json');
    return fs.existsSync(defaultThemeFile);
  }

  /**
   * Get themes directory path
   */
  getThemesDirectory(): string {
    return this.themesDir;
  }
}
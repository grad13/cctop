/**
 * Theme Repository
 * Handles theme loading and listing operations
 */

const fs = require('fs');
const path = require('path');

// Type-only imports
import type { ThemeData, ThemeInfo } from '../../types';

export class ThemeRepository {
  private themesDir: string;

  constructor(themesDir: string) {
    this.themesDir = themesDir;
  }

  /**
   * Get list of available theme files
   */
  getAvailableThemes(): ThemeInfo[] {
    try {
      if (fs.existsSync(this.themesDir)) {
        const files = fs.readdirSync(this.themesDir);
        return files
          .filter((file: string) => file.endsWith('.json'))
          .map((file: string) => {
            const themeName = file.replace('.json', '');
            const themePath = path.join(this.themesDir, file);
            
            try {
              const themeData: ThemeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
              return {
                name: themeName,
                displayName: themeData.name || themeName,
                description: themeData.description || 'No description'
              };
            } catch (error) {
              return {
                name: themeName,
                displayName: themeName,
                description: 'Invalid theme file'
              };
            }
          });
      }
    } catch (error: any) {
      console.warn(`[ThemeRepository] Error listing themes: ${error.message}`);
    }
    
    return [];
  }

  /**
   * Load specific theme data
   */
  loadTheme(themeName: string): ThemeData | null {
    try {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      
      if (fs.existsSync(themeFile)) {
        return JSON.parse(fs.readFileSync(themeFile, 'utf8')) as ThemeData;
      }
    } catch (error: any) {
      console.warn(`[ThemeRepository] Error loading theme ${themeName}: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Check if a theme exists
   */
  themeExists(themeName: string): boolean {
    const themeFile = path.join(this.themesDir, `${themeName}.json`);
    return fs.existsSync(themeFile);
  }

  /**
   * Save a custom theme
   */
  saveTheme(themeName: string, themeData: ThemeData): boolean {
    try {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      fs.writeFileSync(themeFile, JSON.stringify(themeData, null, 2));
      return true;
    } catch (error: any) {
      console.error(`[ThemeRepository] Error saving theme ${themeName}: ${error.message}`);
      return false;
    }
  }
}
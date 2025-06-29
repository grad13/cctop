/**
 * ColorManager - FUNC-207 Display Color Customization
 * Manages theme loading and color application for all display elements
 */

import fs = require('fs');
import path = require('path');
import chalk = require('chalk');
import { 
  ColorMap, 
  ColorConfig, 
  RGBColor, 
  ThemeMetadata, 
  FullThemeData, 
  ThemeInfoResult,
  ThemeColors 
} from '../types';

class ColorManager {
  private configPath: string;
  private currentThemeFile: string;
  private themesDir: string;
  private currentTheme: FullThemeData | null;
  private colorMap: ColorMap;

  constructor(configPath: string = '.cctop') {
    this.configPath = configPath;
    this.currentThemeFile = path.join(configPath, 'current-theme.json');
    this.themesDir = path.join(configPath, 'themes');
    this.currentTheme = null;
    this.colorMap = this.initializeColorMap();
    
    // Load theme on initialization
    this.loadCurrentTheme();
  }

  /**
   * Initialize ANSI color code mapping
   */
  private initializeColorMap(): ColorMap {
    return {
      // Basic colors
      'black': '\x1b[30m',
      'red': '\x1b[31m',
      'green': '\x1b[32m',
      'yellow': '\x1b[33m',
      'blue': '\x1b[34m',
      'magenta': '\x1b[35m',
      'cyan': '\x1b[36m',
      'white': '\x1b[37m',
      
      // Bright colors
      'brightBlack': '\x1b[90m',
      'brightRed': '\x1b[91m',
      'brightGreen': '\x1b[92m',
      'brightYellow': '\x1b[93m',
      'brightBlue': '\x1b[94m',
      'brightMagenta': '\x1b[95m',
      'brightCyan': '\x1b[96m',
      'brightWhite': '\x1b[97m',
      
      // Special colors
      'gray': '\x1b[90m',
      'dim': '\x1b[2m',
      'default': '\x1b[39m',
      'reset': '\x1b[0m'
    };
  }

  /**
   * Load current theme from current-theme.json
   */
  private loadCurrentTheme(): void {
    try {
      if (fs.existsSync(this.currentThemeFile)) {
        const themeData = JSON.parse(fs.readFileSync(this.currentThemeFile, 'utf8')) as FullThemeData;
        this.currentTheme = themeData;
        
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`[ColorManager] Loaded theme: ${themeData.name || 'unknown'}`);
        }
      } else {
        // Create default theme if current-theme.json doesn't exist
        this.createDefaultTheme();
      }
    } catch (error: any) {
      console.warn(`[ColorManager] Error loading theme: ${error.message}`);
      this.loadFallbackTheme();
    }
  }

  /**
   * Create default current-theme.json
   */
  private createDefaultTheme(): void {
    const defaultTheme: FullThemeData = {
      "name": "default",
      "description": "Default color scheme for cctop",
      "lastUpdated": Date.now(),
      "version": "1.0.0",
      "colors": {
        "find": "blue",
        "create": "brightGreen",
        "modify": "white",
        "delete": "gray",
        "move": "cyan",
        "restore": "brightYellow",
        "header": "white",
        "footer": "gray",
        "border": "gray",
        "selection": "cyan",
        "default": "white",
        "table": {
          "column_headers": "white",
          "row": {
            "event_timestamp": "white",
            "elapsed_time": "white", 
            "file_name": "white",
            "event_type": {
              "find": "blue",
              "create": "brightGreen",
              "modify": "white",
              "delete": "gray",
              "move": "cyan",
              "restore": "brightYellow"
            },
            "lines": "white",
            "blocks": "white",
            "directory": "white"
          }
        },
        "status_bar": {
          "label": "white",
          "count": "white",
          "separator": "gray"
        },
        "general_keys": {
          "key_active": "white",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "dim"
        },
        "event_filters": {
          "key_active": "green",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "gray"
        },
        "message_area": {
          "prompt": "cyan",
          "label": "gray",
          "status": "green",
          "pid": "dim",
          "summary": "white"
        }
      }
    };

    try {
      // Ensure .cctop directory exists
      if (!fs.existsSync(this.configPath)) {
        fs.mkdirSync(this.configPath, { recursive: true });
      }
      
      fs.writeFileSync(this.currentThemeFile, JSON.stringify(defaultTheme, null, 2));
      this.currentTheme = defaultTheme;
      
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.log('[ColorManager] Created default theme');
      }
    } catch (error: any) {
      console.warn(`[ColorManager] Error creating default theme: ${error.message}`);
      this.loadFallbackTheme();
    }
  }

  /**
   * Load hardcoded fallback theme
   */
  private loadFallbackTheme(): void {
    this.currentTheme = {
      "name": "fallback",
      "description": "Fallback color scheme",
      "version": "1.0.0",
      "lastUpdated": Date.now(),
      "colors": {
        "find": "blue",
        "create": "brightGreen",
        "modify": "white",
        "delete": "gray",
        "move": "cyan",
        "restore": "brightYellow",
        "header": "white",
        "footer": "gray",
        "border": "gray",
        "selection": "cyan",
        "default": "white",
        "table": {
          "column_headers": "white",
          "row": {
            "event_timestamp": "white",
            "elapsed_time": "white", 
            "file_name": "white",
            "event_type": {
              "find": "blue",
              "create": "brightGreen", 
              "modify": "white",
              "delete": "gray",
              "move": "cyan",
              "restore": "brightYellow"
            },
            "lines": "white",
            "blocks": "white",
            "directory": "white"
          }
        },
        "status_bar": {
          "label": "white",
          "count": "white",
          "separator": "gray"
        },
        "general_keys": {
          "key_active": "white",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "dim"
        },
        "event_filters": {
          "key_active": "green",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "gray"
        },
        "message_area": {
          "prompt": "cyan",
          "label": "gray",
          "status": "green",
          "pid": "dim",
          "summary": "white"
        }
      }
    };
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log('[ColorManager] Loaded fallback theme');
    }
  }

  /**
   * Parse color value (RGB support added)
   * @param colorValue - Color value (preset name or hex)
   * @returns ANSI color code or empty string
   */
  private parseColorValue(colorValue: string): string {
    if (!colorValue) {
      return '';
    }
    
    // RGB hex color support: #FF0000, #00FF00, etc.
    if (colorValue.startsWith('#') && colorValue.length === 7) {
      try {
        // Validate hex format
        const hexPattern = /^#[0-9A-Fa-f]{6}$/;
        if (hexPattern.test(colorValue)) {
          // Force chalk to enable colors for hex processing
          const originalLevel = chalk.level;
          chalk.level = 3; // Force truecolor support
          
          // Extract ANSI code from chalk.hex output
          const coloredText = chalk.hex(colorValue)('test');
          const resetCode = '\x1b[39m'; // Reset foreground color
          const ansiCode = coloredText.replace('test', '').replace(resetCode, '');
          
          // Restore original chalk level
          chalk.level = originalLevel;
          
          return ansiCode;
        }
      } catch (error: any) {
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.warn(`[ColorManager] Invalid hex color: ${colorValue}`);
        }
      }
    }
    
    // Preset color name support (existing functionality)
    if (this.colorMap[colorValue]) {
      return this.colorMap[colorValue];
    }
    
    return '';
  }

  /**
   * Get color code for a given path (RGB support added)
   * @param colorPath - Dot notation path like 'table.row.event_type.create'
   * @returns ANSI color code or empty string
   */
  public getColor(colorPath: string): string {
    if (!this.currentTheme || !this.currentTheme.colors) {
      return '';
    }
    
    try {
      const colorValue = colorPath.split('.').reduce((obj: any, key: string) => obj?.[key], this.currentTheme.colors);
      return this.parseColorValue(colorValue);
    } catch (error: any) {
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.warn(`[ColorManager] Error getting color for path: ${colorPath}`);
      }
    }
    
    return '';
  }

  /**
   * Apply color to text
   * @param text - Text to colorize
   * @param colorPath - Color path in theme
   * @returns Colorized text
   */
  public colorize(text: string, colorPath: string): string {
    const colorCode = this.getColor(colorPath);
    if (colorCode) {
      return `${colorCode}${text}\x1b[0m`;
    }
    return text;
  }

  /**
   * Get event type color (FUNC-202 integration)
   * @param eventType - Event type (find, create, modify, etc.)
   * @returns ANSI color code
   */
  public getEventTypeColor(eventType: string): string {
    return this.getColor(`table.row.event_type.${eventType}`);
  }

  /**
   * Apply event type color (for existing formatEventType integration)
   * @param text - Text to colorize
   * @param eventType - Event type
   * @returns Colorized text
   */
  public colorizeEventType(text: string, eventType: string): string {
    const colorCode = this.getEventTypeColor(eventType);
    if (colorCode) {
      return `${colorCode}${text}\x1b[0m`;
    }
    return text;
  }

  /**
   * Reload theme from disk
   */
  public reloadTheme(): void {
    this.loadCurrentTheme();
  }

  /**
   * Switch to a different preset theme
   * @param themeName - Theme name (without .json extension)
   */
  public switchTheme(themeName: string): boolean {
    try {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      
      if (fs.existsSync(themeFile)) {
        const themeData = JSON.parse(fs.readFileSync(themeFile, 'utf8')) as FullThemeData;
        
        // Update lastUpdated and copy to current-theme.json
        themeData.lastUpdated = Date.now();
        fs.writeFileSync(this.currentThemeFile, JSON.stringify(themeData, null, 2));
        
        this.currentTheme = themeData;
        
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`[ColorManager] Switched to theme: ${themeName}`);
        }
        
        return true;
      } else {
        console.warn(`[ColorManager] Theme file not found: ${themeFile}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[ColorManager] Error switching theme: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current theme info
   */
  public getCurrentThemeInfo(): ThemeInfoResult | null {
    if (this.currentTheme) {
      return {
        name: this.currentTheme.name || 'unknown',
        isDefault: this.currentTheme.name === 'default',
        colors: this.currentTheme.colors,
        description: this.currentTheme.description || '',
        version: this.currentTheme.version || '1.0.0',
        lastUpdated: this.currentTheme.lastUpdated || Date.now()
      };
    }
    return null;
  }

  /**
   * List available preset themes
   */
  public getAvailableThemes(): string[] {
    try {
      if (fs.existsSync(this.themesDir)) {
        const files = fs.readdirSync(this.themesDir);
        return files
          .filter(file => file.endsWith('.json'))
          .map(file => file.replace('.json', ''));
      }
    } catch (error: any) {
      console.warn(`[ColorManager] Error listing themes: ${error.message}`);
    }
    return [];
  }
}

export = ColorManager;
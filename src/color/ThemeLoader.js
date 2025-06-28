/**
 * ThemeLoader - FUNC-207 Theme Management
 * Handles theme directory initialization and preset theme creation
 */

const fs = require('fs');
const path = require('path');

class ThemeLoader {
  constructor(configPath = '.cctop') {
    this.configPath = configPath;
    this.themesDir = path.join(configPath, 'themes');
  }

  /**
   * Initialize themes directory and create preset themes
   */
  async initializeThemes() {
    try {
      // Create themes directory if it doesn't exist
      if (!fs.existsSync(this.themesDir)) {
        fs.mkdirSync(this.themesDir, { recursive: true });
        
        if (process.env.CCTOP_VERBOSE === 'true') {
        }
      }
      
      // Create preset themes
      await this.createPresetThemes();
      
      return true;
    } catch (error) {
      console.error(`[ThemeLoader] Error initializing themes: ${error.message}`);
      return false;
    }
  }

  /**
   * Create all preset theme files
   */
  async createPresetThemes() {
    const presetThemes = {
      'default': this.getDefaultTheme(),
      'high-contrast': this.getHighContrastTheme(),
      'colorful': this.getColorfulTheme(),
      'minimal': this.getMinimalTheme()
    };

    for (const [themeName, themeData] of Object.entries(presetThemes)) {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      
      try {
        // Only create if file doesn't exist (don't overwrite user modifications)
        if (!fs.existsSync(themeFile)) {
          fs.writeFileSync(themeFile, JSON.stringify(themeData, null, 2));
          
          if (process.env.CCTOP_VERBOSE === 'true') {
          }
        }
      } catch (error) {
        console.warn(`[ThemeLoader] Error creating theme ${themeName}: ${error.message}`);
      }
    }
  }

  /**
   * Default theme - balanced standard colors
   */
  getDefaultTheme() {
    return {
      "name": "default",
      "description": "Balanced standard color scheme for general use",
      "version": "1.0.0",
      "colors": {
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
  }

  /**
   * High contrast theme - for better visibility
   */
  getHighContrastTheme() {
    return {
      "name": "high-contrast",
      "description": "High contrast color scheme for improved visibility",
      "version": "1.0.0",
      "colors": {
        "table": {
          "column_headers": "brightWhite",
          "row": {
            "event_timestamp": "brightWhite",
            "elapsed_time": "brightWhite",
            "file_name": "brightWhite",
            "event_type": {
              "find": "brightBlue",
              "create": "brightGreen",
              "modify": "brightWhite",
              "delete": "brightRed",
              "move": "brightCyan",
              "restore": "brightYellow"
            },
            "lines": "brightWhite",
            "blocks": "brightWhite",
            "directory": "brightWhite"
          }
        },
        "status_bar": {
          "label": "brightWhite",
          "count": "brightWhite",
          "separator": "white"
        },
        "general_keys": {
          "key_active": "brightWhite",
          "key_inactive": "white",
          "label_active": "brightWhite",
          "label_inactive": "white"
        },
        "event_filters": {
          "key_active": "brightGreen",
          "key_inactive": "white",
          "label_active": "brightWhite",
          "label_inactive": "white"
        },
        "message_area": {
          "prompt": "brightCyan",
          "label": "brightWhite",
          "status": "brightGreen",
          "pid": "white",
          "summary": "brightWhite"
        }
      }
    };
  }

  /**
   * Colorful theme - vibrant colors for clear distinction
   */
  getColorfulTheme() {
    return {
      "name": "colorful",
      "description": "Vibrant color scheme with clear element distinction",
      "version": "1.0.0",
      "colors": {
        "table": {
          "column_headers": "brightMagenta",
          "row": {
            "event_timestamp": "brightCyan",
            "elapsed_time": "brightYellow",
            "file_name": "brightWhite",
            "event_type": {
              "find": "brightBlue",
              "create": "brightGreen",
              "modify": "brightYellow",
              "delete": "brightRed",
              "move": "brightMagenta",
              "restore": "brightCyan"
            },
            "lines": "cyan",
            "blocks": "yellow",
            "directory": "blue"
          }
        },
        "status_bar": {
          "label": "brightMagenta",
          "count": "brightWhite",
          "separator": "brightBlue"
        },
        "general_keys": {
          "key_active": "brightCyan",
          "key_inactive": "dim",
          "label_active": "brightWhite",
          "label_inactive": "gray"
        },
        "event_filters": {
          "key_active": "brightCyan",
          "key_inactive": "dim",
          "label_active": "brightWhite",
          "label_inactive": "gray"
        },
        "message_area": {
          "prompt": "brightMagenta",
          "label": "brightBlue",
          "status": "brightGreen",
          "pid": "dim",
          "summary": "brightWhite"
        }
      }
    };
  }

  /**
   * Minimal theme - subtle colors for clean appearance
   */
  getMinimalTheme() {
    return {
      "name": "minimal",
      "description": "Minimal color scheme with subtle distinctions",
      "version": "1.0.0",
      "colors": {
        "table": {
          "column_headers": "white",
          "row": {
            "event_timestamp": "gray",
            "elapsed_time": "gray",
            "file_name": "white",
            "event_type": {
              "find": "gray",
              "create": "white",
              "modify": "white",
              "delete": "dim",
              "move": "gray",
              "restore": "white"
            },
            "lines": "dim",
            "blocks": "dim",
            "directory": "gray"
          }
        },
        "status_bar": {
          "label": "white",
          "count": "white",
          "separator": "dim"
        },
        "general_keys": {
          "key_active": "white",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "dim"
        },
        "event_filters": {
          "key_active": "white",
          "key_inactive": "dim",
          "label_active": "white",
          "label_inactive": "dim"
        },
        "message_area": {
          "prompt": "white",
          "label": "gray",
          "status": "white",
          "pid": "dim",
          "summary": "white"
        }
      }
    };
  }

  /**
   * Check if themes directory exists and is properly initialized
   */
  isInitialized() {
    if (!fs.existsSync(this.themesDir)) {
      return false;
    }

    // Check if at least default theme exists
    const defaultThemeFile = path.join(this.themesDir, 'default.json');
    return fs.existsSync(defaultThemeFile);
  }

  /**
   * Get list of available theme files
   */
  getAvailableThemes() {
    try {
      if (fs.existsSync(this.themesDir)) {
        const files = fs.readdirSync(this.themesDir);
        return files
          .filter(file => file.endsWith('.json'))
          .map(file => {
            const themeName = file.replace('.json', '');
            const themePath = path.join(this.themesDir, file);
            
            try {
              const themeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
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
    } catch (error) {
      console.warn(`[ThemeLoader] Error listing themes: ${error.message}`);
    }
    
    return [];
  }

  /**
   * Load specific theme data
   */
  loadTheme(themeName) {
    try {
      const themeFile = path.join(this.themesDir, `${themeName}.json`);
      
      if (fs.existsSync(themeFile)) {
        return JSON.parse(fs.readFileSync(themeFile, 'utf8'));
      }
    } catch (error) {
      console.warn(`[ThemeLoader] Error loading theme ${themeName}: ${error.message}`);
    }
    
    return null;
  }
}

module.exports = ThemeLoader;
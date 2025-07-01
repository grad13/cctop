/**
 * ThemeLoader - FUNC-207 Theme Management
 * Main theme loader that coordinates theme initialization and repository
 */

const path = require('path');

// Type-only imports
import type { 
  ThemeData,
  ThemeInfo
} from '../types';

// Import components
import { ThemeInitializer } from './loaders/ThemeInitializer';
import { ThemeRepository } from './loaders/ThemeRepository';

class ThemeLoader {
  private configPath: string;
  private themesDir: string;
  private initializer: ThemeInitializer;
  private repository: ThemeRepository;

  constructor(configPath: string = '.cctop') {
    this.configPath = configPath;
    this.themesDir = path.join(configPath, 'themes');
    
    // Initialize components
    this.initializer = new ThemeInitializer(configPath);
    this.repository = new ThemeRepository(this.themesDir);
  }

  /**
   * Initialize themes directory and create preset themes
   */
  async initializeThemes(): Promise<boolean> {
    return await this.initializer.initialize();
  }

  /**
   * Check if themes directory exists and is properly initialized
   */
  isInitialized(): boolean {
    return this.initializer.isInitialized();
  }

  /**
   * Get list of available theme files
   */
  getAvailableThemes(): ThemeInfo[] {
    return this.repository.getAvailableThemes();
  }

  /**
   * Load specific theme data
   */
  loadTheme(themeName: string): ThemeData | null {
    return this.repository.loadTheme(themeName);
  }

  /**
   * Save a custom theme
   */
  saveTheme(themeName: string, themeData: ThemeData): boolean {
    return this.repository.saveTheme(themeName, themeData);
  }

  /**
   * Check if a theme exists
   */
  themeExists(themeName: string): boolean {
    return this.repository.themeExists(themeName);
  }

  /**
   * Get themes directory path
   */
  getThemesDirectory(): string {
    return this.themesDir;
  }
}

module.exports = ThemeLoader;
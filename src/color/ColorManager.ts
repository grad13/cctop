/**
 * ColorManager - Facade for color management system
 * FUNC-207: Display Color Customization
 * Maintains backward compatibility while delegating to specialized components
 */

import { ThemeLoader } from './loaders/ThemeLoader';
import { ColorConverter } from './converters/ColorConverter';
import { ColorApplier } from './appliers/ColorApplier';
import { 
  ColorTheme,
  EventTypeColor,
  TableElementType,
  StatusType,
  MessageType,
  ThemeInfo
} from './types/ThemeTypes';

class ColorManager {
  private themeLoader: ThemeLoader;
  private colorConverter: ColorConverter;
  private colorApplier: ColorApplier;
  private currentTheme: ColorTheme | null = null;
  private initialized: boolean = false;

  constructor(configPath: string = '.cctop') {
    this.themeLoader = new ThemeLoader(configPath);
    this.colorConverter = new ColorConverter();
    this.colorApplier = new ColorApplier(this.colorConverter, null);
    
    // Start async initialization
    this.loadCurrentTheme();
  }

  /**
   * Load current theme asynchronously
   */
  private async loadCurrentTheme(): Promise<void> {
    try {
      this.currentTheme = await this.themeLoader.getCurrentTheme();
      this.colorApplier.updateTheme(this.currentTheme);
      this.initialized = true;
    } catch (error) {
      console.warn('[ColorManager] Failed to load theme, using defaults:', error);
      this.initialized = true;
    }
  }

  /**
   * Get color for specific element (backward compatibility)
   */
  getColor(path: string): string | undefined {
    if (!this.currentTheme || !this.currentTheme.colors) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current: any = this.currentTheme.colors;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Apply table colors (backward compatibility)
   */
  applyTableColors(text: string, type: string): string {
    return this.colorApplier.applyTableColors(text, type as TableElementType);
  }

  /**
   * Apply event type colors (backward compatibility)
   */
  applyEventTypeColor(text: string, eventType: string): string {
    return this.colorApplier.applyEventTypeColor(text, eventType as EventTypeColor);
  }

  /**
   * Apply status colors (backward compatibility)
   */
  applyStatusColor(text: string, type: string): string {
    return this.colorApplier.applyStatusColor(text, type as StatusType);
  }

  /**
   * Apply general key colors (backward compatibility)
   */
  applyGeneralKeyColor(text: string, active: boolean): string {
    return this.colorApplier.applyGeneralKeyColor(text, active);
  }

  /**
   * Apply filter key colors (backward compatibility)
   */
  applyFilterKeyColor(text: string, filterType: string, active: boolean): string {
    return this.colorApplier.applyFilterKeyColor(text, filterType as EventTypeColor, active);
  }

  /**
   * Apply message colors (backward compatibility)
   */
  applyMessageColor(text: string, type: string): string {
    return this.colorApplier.applyMessageColor(text, type as MessageType);
  }

  /**
   * Convert to ANSI code (backward compatibility)
   */
  convertToANSI(color: string): string {
    return this.colorConverter.convertToANSI(color);
  }

  /**
   * Parse color value (backward compatibility)
   */
  parseColorValue(value: string | undefined): any {
    return this.colorConverter.parseColorValue(value);
  }

  /**
   * Parse RGB hex (backward compatibility)
   */
  parseRGBHex(hex: string): any {
    return this.colorConverter.parseRGBHex(hex);
  }

  /**
   * List available themes (backward compatibility)
   */
  async listAvailableThemes(): Promise<ThemeInfo[]> {
    return this.themeLoader.listAvailableThemes();
  }

  /**
   * Load theme (backward compatibility)
   */
  async loadTheme(name: string): Promise<void> {
    try {
      const theme = await this.themeLoader.loadTheme(name);
      this.currentTheme = theme;
      this.colorApplier.updateTheme(theme);
      await this.themeLoader.setCurrentTheme(name);
    } catch (error) {
      console.error('[ColorManager] Failed to load theme:', error);
      throw error;
    }
  }

  /**
   * Get current theme (backward compatibility)
   */
  getCurrentTheme(): ColorTheme | null {
    return this.currentTheme;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Colorize text (backward compatibility)
   */
  colorize(text: string, color: string | undefined): string {
    if (!color) return text;
    return this.colorConverter.parseColorValue(color)(text);
  }

  /**
   * Colorize event type (backward compatibility)
   */
  colorizeEventType(text: string, eventType: string): string {
    return this.colorApplier.applyEventTypeColor(text, eventType as EventTypeColor);
  }
}

// Export for backward compatibility
export = ColorManager;
/**
 * Color Converter
 * Handles color format conversion between ANSI, RGB, HEX and named colors
 */

import chalk = require('chalk');
import { ColorMap, RGBColor } from '../types/ThemeTypes';

export class ColorConverter {
  private colorMap: Map<string, string>;
  private namedColors: Map<string, chalk.Chalk>;

  constructor() {
    this.colorMap = this.initializeColorMap();
    this.namedColors = this.initializeNamedColors();
  }

  /**
   * Convert color value to ANSI escape code
   */
  convertToANSI(color: string): string {
    // Direct ANSI code
    if (this.isValidANSIColor(color)) {
      return color;
    }
    
    // Named color mapping
    const ansiCode = this.colorMap.get(color.toLowerCase());
    if (ansiCode) {
      return ansiCode;
    }
    
    // Default to white
    return '\x1b[37m';
  }

  /**
   * Parse RGB hex color to chalk
   */
  parseRGBHex(hex: string): chalk.Chalk {
    if (!this.isValidHexColor(hex)) {
      return chalk.white;
    }

    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    
    return chalk.rgb(r, g, b);
  }

  /**
   * Parse any color value to chalk
   */
  parseColorValue(value: string | undefined): chalk.Chalk {
    if (!value) {
      return chalk.white;
    }

    // Try hex color first
    if (value.startsWith('#') || this.isValidHexColor(value)) {
      return this.parseRGBHex(value);
    }

    // Try RGB format (e.g., "rgb(255,0,0)")
    const rgbMatch = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (rgbMatch) {
      return chalk.rgb(
        parseInt(rgbMatch[1]),
        parseInt(rgbMatch[2]),
        parseInt(rgbMatch[3])
      );
    }

    // Try named color
    return this.handleNamedColor(value);
  }

  /**
   * Convert RGB object to chalk
   */
  rgbToChalk(rgb: RGBColor): chalk.Chalk {
    return chalk.rgb(
      Math.min(255, Math.max(0, rgb.r)),
      Math.min(255, Math.max(0, rgb.g)),
      Math.min(255, Math.max(0, rgb.b))
    );
  }

  /**
   * Initialize ANSI color code mapping
   */
  private initializeColorMap(): Map<string, string> {
    const map = new Map<string, string>();
    
    // Basic colors
    map.set('black', '\x1b[30m');
    map.set('red', '\x1b[31m');
    map.set('green', '\x1b[32m');
    map.set('yellow', '\x1b[33m');
    map.set('blue', '\x1b[34m');
    map.set('magenta', '\x1b[35m');
    map.set('cyan', '\x1b[36m');
    map.set('white', '\x1b[37m');
    
    // Bright colors
    map.set('brightblack', '\x1b[90m');
    map.set('brightred', '\x1b[91m');
    map.set('brightgreen', '\x1b[92m');
    map.set('brightyellow', '\x1b[93m');
    map.set('brightblue', '\x1b[94m');
    map.set('brightmagenta', '\x1b[95m');
    map.set('brightcyan', '\x1b[96m');
    map.set('brightwhite', '\x1b[97m');
    
    // Alternative names
    map.set('gray', '\x1b[90m');
    map.set('grey', '\x1b[90m');
    
    // Reset
    map.set('reset', '\x1b[0m');
    
    return map;
  }

  /**
   * Initialize named color to chalk mapping
   */
  private initializeNamedColors(): Map<string, chalk.Chalk> {
    const colors = new Map<string, chalk.Chalk>();
    
    // Basic colors
    colors.set('black', chalk.black);
    colors.set('red', chalk.red);
    colors.set('green', chalk.green);
    colors.set('yellow', chalk.yellow);
    colors.set('blue', chalk.blue);
    colors.set('magenta', chalk.magenta);
    colors.set('cyan', chalk.cyan);
    colors.set('white', chalk.white);
    
    // Bright colors
    colors.set('brightblack', chalk.blackBright);
    colors.set('brightred', chalk.redBright);
    colors.set('brightgreen', chalk.greenBright);
    colors.set('brightyellow', chalk.yellowBright);
    colors.set('brightblue', chalk.blueBright);
    colors.set('brightmagenta', chalk.magentaBright);
    colors.set('brightcyan', chalk.cyanBright);
    colors.set('brightwhite', chalk.whiteBright);
    
    // Aliases
    colors.set('gray', chalk.gray);
    colors.set('grey', chalk.grey);
    
    return colors;
  }

  /**
   * Check if string is valid hex color
   */
  private isValidHexColor(color: string): boolean {
    const hex = color.replace('#', '');
    return /^[0-9A-Fa-f]{6}$/.test(hex);
  }

  /**
   * Check if string is valid ANSI color code
   */
  private isValidANSIColor(color: string): boolean {
    return /^\x1b\[\d{1,3}m$/.test(color);
  }

  /**
   * Handle named color conversion
   */
  private handleNamedColor(color: string): chalk.Chalk {
    const chalkColor = this.namedColors.get(color.toLowerCase());
    if (chalkColor) {
      return chalkColor;
    }
    
    // Try chalk's built-in colors
    try {
      const chalkAny = chalk as any;
      if (typeof chalkAny[color] === 'function') {
        return chalkAny[color];
      }
    } catch {
      // Ignore invalid color names
    }
    
    // Default to white
    return chalk.white;
  }
}
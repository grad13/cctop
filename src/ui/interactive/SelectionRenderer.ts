/**
 * FUNC-400: Selection Renderer
 * Handles visual selection state - background/foreground color changes for selected rows
 */

import chalk = require('chalk');
import ColorManager = require('../../color/ColorManager');

interface SelectionConfig {
  background: string;
  foreground: string;
}

class SelectionRenderer {
  private colorManager: ColorManager;
  private debug: boolean;
  private selectionConfig: SelectionConfig;

  constructor(colorManager: ColorManager | null = null) {
    this.colorManager = colorManager || new ColorManager();
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    this.selectionConfig = this.loadSelectionConfig();
    
    if (this.debug) {
      console.log('[SelectionRenderer] Initialized with selection colors');
    }
  }

  /**
   * Load selection color configuration from theme
   */
  private loadSelectionConfig(): SelectionConfig {
    // Default selection colors (FUNC-400 specification)
    const defaults: SelectionConfig = {
      background: '#0066cc',
      foreground: '#ffffff'
    };

    try {
      // Try to get from theme system (FUNC-207 integration)
      const bgColor: string = this.colorManager.getColor('display.selection.background');
      const fgColor: string = this.colorManager.getColor('display.selection.foreground');
      
      return {
        background: bgColor || defaults.background,
        foreground: fgColor || defaults.foreground
      };
    } catch (error: any) {
      if (this.debug) {
        console.warn('[SelectionRenderer] Failed to load theme colors, using defaults');
      }
      return defaults;
    }
  }

  /**
   * Apply selection styling to a text line (FUNC-400 core requirement)
   * @param text - The text line to style
   * @param isSelected - Whether this line is selected
   * @returns Styled text with selection colors
   */
  renderLine(text: string, isSelected: boolean = false): string {
    if (!isSelected) {
      return text; // No change for non-selected lines
    }

    // FUNC-400: Apply background and foreground colors for selected line
    // Use simple and reliable chalk for now to ensure visibility
    if (this.debug) {
      console.log(`[SelectionRenderer] Applying selection style to: ${text.substring(0, 50)}...`);
    }
    
    // Strip existing ANSI codes to avoid conflicts
    const cleanText: string = text.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Apply clear selection styling
    return chalk.bgCyan.black(cleanText);
  }

  /**
   * Convert foreground ANSI color code to background color code
   * @param fgCode - Foreground ANSI color code (e.g., '\x1b[31m')
   * @returns Background ANSI color code
   */
  convertToBackgroundColor(fgCode: string): string {
    // Convert foreground codes (30-37, 90-97) to background codes (40-47, 100-107)
    return fgCode.replace(/\x1b\[(\d+)m/, (match: string, code: string) => {
      const num: number = parseInt(code);
      if (num >= 30 && num <= 37) {
        return `\x1b[${num + 10}m`; // 30-37 -> 40-47
      } else if (num >= 90 && num <= 97) {
        return `\x1b[${num + 10}m`; // 90-97 -> 100-107
      }
      return match; // Return unchanged if not a foreground color
    });
  }

  /**
   * Apply selection styling to multiple lines with selection index
   * @param lines - Array of text lines
   * @param selectedIndex - Index of selected line (-1 for no selection)
   * @returns Array of styled lines
   */
  renderLines(lines: string[], selectedIndex: number = -1): string[] {
    return lines.map((line: string, index: number) => {
      const isSelected: boolean = (index === selectedIndex);
      return this.renderLine(line, isSelected);
    });
  }

  /**
   * Update selection configuration (for theme changes)
   */
  updateSelectionConfig(): void {
    this.selectionConfig = this.loadSelectionConfig();
    if (this.debug) {
      console.log('[SelectionRenderer] Selection config updated');
    }
  }
}

export = SelectionRenderer;
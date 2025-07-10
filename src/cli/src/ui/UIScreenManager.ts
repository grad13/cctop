/**
 * UI Screen Manager
 * Handles screen initialization and terminal configuration
 */

import * as blessed from 'blessed';

export class UIScreenManager {
  private screen!: blessed.Widgets.Screen;

  initializeScreen(): blessed.Widgets.Screen {
    // Suppress terminal compatibility warnings
    const originalStderr = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = function(chunk: any, encoding?: any, callback?: any): boolean {
      const str = chunk.toString();
      if (str.includes('Error on xterm') || str.includes('Setulc')) {
        return true;
      }
      return originalStderr(chunk, encoding, callback);
    };

    // Force terminal type to avoid Setulc capability issues
    (process as any).env.TERM = 'xterm';
    
    // Monkey patch blessed's terminal capability detection
    const blessedProgram = (blessed as any).program;
    if (blessedProgram && blessedProgram.prototype) {
      const originalParse = blessedProgram.prototype._parseTerminfo;
      blessedProgram.prototype._parseTerminfo = function() {
        const result = originalParse.apply(this, arguments);
        // Disable problematic capabilities
        if (this.terminfo) {
          delete this.terminfo.Setulc;
          delete this.terminfo.setulc;
        }
        return result;
      };
    }

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP v0.5.0.0',
      fullUnicode: true,
      autoPadding: false,
      warnings: false,
      forceUnicode: true,
      dockBorders: false,
      ignoreDockContrast: true,
      terminal: 'xterm',
      disableUnderline: true,
      style: {
        bg: 'transparent'
      }
    } as any);

    return this.screen;
  }

  getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  destroy(): void {
    if (this.screen) {
      try {
        this.screen.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}
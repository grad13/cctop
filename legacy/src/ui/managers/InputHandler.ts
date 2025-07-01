/**
 * Input Handler
 * Manages keyboard input and terminal resize events
 */

import { EventEmitter } from 'events';

export interface InputHandlerEvents {
  'keypress': (key: string) => void;
  'resize': () => void;
  'exit': () => void;
}

export class InputHandler extends EventEmitter {
  private isActive: boolean = false;
  private resizeHandler: (() => void) | null = null;

  /**
   * Start handling input
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.setupKeyboardHandlers();
    this.setupResizeHandler();
  }

  /**
   * Stop handling input
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove keyboard handler
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
    }
    
    // Remove resize handler
    if (this.resizeHandler) {
      process.stdout.removeListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    if (!process.stdin.isTTY) return;
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key: string) => {
      if (!this.isActive) return;
      
      // Handle exit keys
      if (key === '\u0003' || key === 'q' || key === 'Q') {
        this.emit('exit');
        return;
      }
      
      // Emit keypress event for other keys
      this.emit('keypress', key);
    });
  }

  /**
   * Setup terminal resize handler
   */
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      if (!this.isActive) return;
      this.emit('resize');
    };
    
    process.stdout.on('resize', this.resizeHandler);
  }

  /**
   * Check if handler is active
   */
  isHandlerActive(): boolean {
    return this.isActive;
  }
}
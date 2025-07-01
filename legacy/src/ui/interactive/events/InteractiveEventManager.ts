/**
 * Interactive Event Manager
 * Manages event flow between interactive components
 */

import { EventEmitter } from 'events';
import type { FileItem, ICLIDisplay } from '../types/ComponentTypes';

export class InteractiveEventManager extends EventEmitter {
  private cliDisplay: ICLIDisplay | null = null;
  private debug: boolean;

  constructor(cliDisplay: ICLIDisplay | null = null) {
    super();
    this.cliDisplay = cliDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Prevent memory leaks
    this.setMaxListeners(20);
  }

  /**
   * Update file list from current events
   */
  extractFileListFromEvents(): string[] {
    if (!this.cliDisplay) return [];
    
    try {
      const fileList: string[] = [];
      
      // If we have access to the event display manager
      if (this.cliDisplay.eventDisplayManager?.getEventsToDisplay) {
        // Get current events and extract unique file paths
        const events = this.cliDisplay.eventDisplayManager.getEventsToDisplay();
        if (events && Array.isArray(events)) {
          const uniqueFiles = new Set<string>();
          events.forEach((event: any) => {
            if (event.file_name) {
              uniqueFiles.add(event.file_name);
            }
          });
          fileList.push(...Array.from(uniqueFiles));
        }
      }
      
      if (this.debug) {
        console.log(`[InteractiveEventManager] Extracted ${fileList.length} files from events`);
      }
      
      return fileList;
    } catch (error) {
      if (this.debug) {
        console.error('[InteractiveEventManager] Failed to extract file list:', error);
      }
      return [];
    }
  }

  /**
   * Emit file list update event
   */
  emitFileListUpdate(fileList: string[]): void {
    this.emit('fileListUpdate', fileList);
    
    if (this.debug) {
      console.log(`[InteractiveEventManager] Emitted file list update with ${fileList.length} files`);
    }
  }

  /**
   * Emit selection event
   */
  emitFileSelected(file: FileItem): void {
    this.emit('fileSelected', file);
    
    if (this.debug) {
      console.log('[InteractiveEventManager] Emitted file selection:', file.name);
    }
  }

  /**
   * Emit mode change event
   */
  emitModeChange(mode: string): void {
    this.emit('modeChange', mode);
    
    if (this.debug) {
      console.log('[InteractiveEventManager] Emitted mode change:', mode);
    }
  }

  /**
   * Emit key input event
   */
  emitKeyInput(key: string): void {
    this.emit('keyInput', key);
    
    if (this.debug) {
      console.log('[InteractiveEventManager] Emitted key input:', key);
    }
  }

  /**
   * Subscribe to file list updates
   */
  onFileListUpdate(callback: (fileList: string[]) => void): void {
    this.on('fileListUpdate', callback);
  }

  /**
   * Subscribe to file selection
   */
  onFileSelected(callback: (file: FileItem) => void): void {
    this.on('fileSelected', callback);
  }

  /**
   * Subscribe to mode changes
   */
  onModeChange(callback: (mode: string) => void): void {
    this.on('modeChange', callback);
  }

  /**
   * Subscribe to key inputs
   */
  onKeyInput(callback: (key: string) => void): void {
    this.on('keyInput', callback);
  }

  /**
   * Update CLI display reference
   */
  setCLIDisplay(cliDisplay: ICLIDisplay): void {
    this.cliDisplay = cliDisplay;
  }

  /**
   * Cleanup all listeners
   */
  cleanup(): void {
    this.removeAllListeners();
    this.cliDisplay = null;
    
    if (this.debug) {
      console.log('[InteractiveEventManager] Cleaned up');
    }
  }

  /**
   * Get event manager status
   */
  getEventStatus(): object {
    return {
      hasCLIDisplay: !!this.cliDisplay,
      listenerCounts: {
        fileListUpdate: this.listenerCount('fileListUpdate'),
        fileSelected: this.listenerCount('fileSelected'),
        modeChange: this.listenerCount('modeChange'),
        keyInput: this.listenerCount('keyInput')
      },
      maxListeners: this.getMaxListeners()
    };
  }
}
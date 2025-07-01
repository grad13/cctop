/**
 * Display Coordinator
 * Coordinates the aggregate and history displays for detail inspection mode
 */

import type { 
  IDisplayCoordinator, 
  IAggregateDisplay, 
  IHistoryDisplay, 
  SelectedFile,
  ISelectedFile 
} from '../interfaces/ControllerInterfaces';

export class DisplayCoordinator implements IDisplayCoordinator {
  private aggregateDisplay: IAggregateDisplay;
  private historyDisplay: IHistoryDisplay;
  private debug: boolean;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay
  ) {
    this.aggregateDisplay = aggregateDisplay;
    this.historyDisplay = historyDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Coordinate displays initialization
   */
  async coordinateDisplays(file: SelectedFile): Promise<void> {
    const filePath = this.extractFilePath(file);
    
    if (!filePath) {
      throw new Error('[DisplayCoordinator] Invalid file object: cannot extract path');
    }

    if (this.debug) {
      console.log('[DisplayCoordinator] Coordinating displays for:', filePath);
    }

    try {
      // Store initialization promise to prevent concurrent initializations
      this.initializationPromise = this.initializeDisplays(filePath);
      await this.initializationPromise;
      this.initializationPromise = null;

      if (this.debug) {
        console.log('[DisplayCoordinator] Displays coordinated successfully');
      }
    } catch (error) {
      this.initializationPromise = null;
      console.error('[DisplayCoordinator] Failed to coordinate displays:', error);
      throw error;
    }
  }

  /**
   * Initialize both displays in parallel
   */
  private async initializeDisplays(filePath: string): Promise<void> {
    const initPromises: Promise<void>[] = [];

    // Initialize aggregate display
    initPromises.push(
      this.aggregateDisplay.initialize(filePath).catch(error => {
        console.error('[DisplayCoordinator] Aggregate display initialization failed:', error);
        throw error;
      })
    );

    // Initialize history display
    initPromises.push(
      this.historyDisplay.initialize(filePath).catch(error => {
        console.error('[DisplayCoordinator] History display initialization failed:', error);
        throw error;
      })
    );

    // Wait for both to complete
    await Promise.all(initPromises);
  }

  /**
   * Handle key navigation events
   */
  async handleKeyNavigation(key: string): Promise<void> {
    // Ensure initialization is complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    try {
      // Forward navigation keys to history display
      if (this.historyDisplay.navigate && (key === 'ArrowUp' || key === 'ArrowDown')) {
        await this.historyDisplay.navigate(key);
        
        if (this.debug) {
          console.log('[DisplayCoordinator] Key navigation handled:', key);
        }
      }
    } catch (error) {
      console.error('[DisplayCoordinator] Key navigation failed:', error);
      // Navigation errors should not be fatal
    }
  }

  /**
   * Cleanup both displays
   */
  cleanupDisplays(): void {
    try {
      // Cancel any pending initialization
      this.initializationPromise = null;

      // Cleanup aggregate display
      if (this.aggregateDisplay.cleanup) {
        try {
          this.aggregateDisplay.cleanup();
        } catch (error) {
          console.error('[DisplayCoordinator] Aggregate cleanup failed:', error);
        }
      }

      // Cleanup history display
      if (this.historyDisplay.cleanup) {
        try {
          this.historyDisplay.cleanup();
        } catch (error) {
          console.error('[DisplayCoordinator] History cleanup failed:', error);
        }
      }

      if (this.debug) {
        console.log('[DisplayCoordinator] Displays cleaned up');
      }
    } catch (error) {
      console.error('[DisplayCoordinator] Cleanup failed:', error);
    }
  }

  /**
   * Check if displays are ready
   */
  async isReadyForDisplay(): Promise<boolean> {
    try {
      // Wait for any pending initialization
      if (this.initializationPromise) {
        await this.initializationPromise;
      }

      // Check if both displays can render
      const aggregateReady = this.isAggregateReady();
      const historyReady = this.isHistoryReady();
      
      return aggregateReady && historyReady;
    } catch (error) {
      console.error('[DisplayCoordinator] Ready check failed:', error);
      return false;
    }
  }

  /**
   * Check if aggregate display is ready
   */
  private isAggregateReady(): boolean {
    try {
      return this.aggregateDisplay.render() !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if history display is ready
   */
  private isHistoryReady(): boolean {
    try {
      return this.historyDisplay.render() !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract file path from SelectedFile
   */
  private extractFilePath(file: SelectedFile): string | null {
    if (!file) return null;
    
    if (typeof file === 'string') {
      return file;
    }
    
    const fileObj = file as ISelectedFile;
    if (fileObj.name && fileObj.name.trim()) {
      return fileObj.path ? `${fileObj.path}/${fileObj.name}` : fileObj.name;
    }
    
    return 'empty_filename_entry';
  }

  /**
   * Get coordinator status for debugging
   */
  getStatus(): object {
    return {
      hasInitializationPending: !!this.initializationPromise,
      aggregateReady: this.isAggregateReady(),
      historyReady: this.isHistoryReady()
    };
  }
}
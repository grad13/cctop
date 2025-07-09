/**
 * UI Key Handler
 * Manages all keyboard input and key bindings
 */

import * as blessed from 'blessed';
import { UIState, EventType } from './UIState';

export class UIKeyHandler {
  private screen: blessed.Widgets.Screen;
  private uiState: UIState;
  private eventList: any;
  private refreshDataCallback: () => Promise<void>;
  private updateDisplayCallback: () => void;
  private updateDynamicControlCallback: () => void;
  private updateStatusBarCallback: () => void;
  private stopCallback: () => void;
  private loadMoreCallback?: () => Promise<void>;
  private searchDebounceTimer?: NodeJS.Timeout;
  private readonly SEARCH_DEBOUNCE_MS = 300; // 300ms delay

  private readonly FILTER_KEY_MAP: { [key: string]: EventType } = {
    'f': 'find',
    'c': 'create',
    'm': 'modify',
    'd': 'delete',
    'v': 'move',
    'r': 'restore'
  };

  constructor(
    screen: blessed.Widgets.Screen,
    uiState: UIState,
    eventList: any,
    callbacks: {
      refreshData: () => Promise<void>;
      updateDisplay: () => void;
      updateDynamicControl: () => void;
      updateStatusBar: () => void;
      stop: () => void;
      loadMore?: () => Promise<void>;
    }
  ) {
    this.screen = screen;
    this.uiState = uiState;
    this.eventList = eventList;
    this.refreshDataCallback = callbacks.refreshData;
    this.updateDisplayCallback = callbacks.updateDisplay;
    this.updateDynamicControlCallback = callbacks.updateDynamicControl;
    this.updateStatusBarCallback = callbacks.updateStatusBar;
    this.stopCallback = callbacks.stop;
    this.loadMoreCallback = callbacks.loadMore;
  }

  setupKeyHandlers(): void {
    
    this.setupGlobalKeys();
    this.setupModeKeys();
    this.setupFilterKeys();
    this.setupNavigationKeys();
  }

  private setupGlobalKeys(): void {
    // Exit
    this.screen.key(['q', 'C-c'], () => {
      this.stopCallback();
      process.exit(0);
    });

    // Escape - FUNC-202: discard edits and restore previous state
    this.screen.key(['escape'], () => {
      this.discardEditsAndRestorePrevious();
    });
    
    // Note: Backspace handling is done in keypress event for search mode

    // Manual refresh
    this.screen.key(['x'], () => {
      this.refreshDataCallback();
    });

    // Pause/Resume
    this.screen.key(['space'], () => {
      this.togglePause();
    });
  }

  private setupModeKeys(): void {
    // Filter mode toggle
    this.screen.key(['f'], () => {
      if (this.uiState.isNormalOrPaused()) {
        this.enterFilterMode();
      } else if (this.uiState.getDisplayState() === 'filter') {
        this.toggleEventFilter('find');
      }
    });

    // Search mode
    this.screen.key(['/'], () => {
      if (this.uiState.isNormalOrPaused()) {
        this.enterSearchMode();
      }
    });

    // Search mode character input
    this.screen.on('keypress', (ch: string, key: any) => {
      if (this.uiState.getDisplayState() === 'search') {
        if (key && key.name === 'backspace') {
          this.uiState.backspaceSearchText();
          this.updateDynamicControlCallback();
          this.updateStatusBarCallback();  // Update header with keyword
          this.screen.render();  // Ensure immediate visual update
          // Use debounced search
          this.debouncedSearch();
        } else if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
          this.uiState.appendToSearchText(ch);
          this.updateDynamicControlCallback();
          this.updateStatusBarCallback();  // Update header with keyword
          this.screen.render();  // Ensure immediate visual update
          // Use debounced search
          this.debouncedSearch();
        }
      }
    });

    // FUNC-202: Enter - confirm filter/search and overwrite state
    this.screen.key(['enter'], () => {
      if (this.uiState.getDisplayState() === 'search') {
        this.confirmSearch();
      } else if (this.uiState.getDisplayState() === 'filter') {
        this.confirmFilter();
      }
    });

    // FUNC-202: Shift+Enter - execute DB search (search mode only)
    this.screen.key(['S-enter'], () => {
      if (this.uiState.getDisplayState() === 'search') {
        this.executeDbSearch();
      }
    });

    // Display mode switching
    this.screen.key(['a'], () => {
      this.switchDisplayMode('all');
    });

    this.screen.key(['u'], () => {
      this.switchDisplayMode('unique');
    });
  }

  private setupFilterKeys(): void {
    const filterKeyMap = { ...this.FILTER_KEY_MAP };
    delete filterKeyMap.f; // 'f' is handled in setupModeKeys

    Object.entries(filterKeyMap).forEach(([key, eventType]) => {
      this.screen.key([key], () => {
        if (this.uiState.getDisplayState() === 'filter') {
          this.toggleEventFilter(eventType);
        }
      });
    });
  }

  private setupNavigationKeys(): void {
    // Since we're using box instead of list, we need to handle up/down keys manually
    this.screen.key(['up', 'k'], () => {
      // Allow navigation in normal, paused, filter, and search modes
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        this.uiState.moveSelectionUp();
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['down', 'j'], async () => {
      // Allow navigation in normal, paused, filter, and search modes
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        const currentIndex = this.uiState.getSelectedIndex();
        const eventsCount = this.uiState.getEventsCount();
        const hasMore = this.uiState.hasMoreDataToLoad();
        
        // Extra safety check to prevent wrapping
        if (currentIndex >= eventsCount - 1) {
          return;
        }
        
        this.uiState.moveSelectionDown();
        this.updateDisplayCallback();
        
        // Check if we need to load more data
        // Use the new comprehensive load strategy
        if (this.uiState.shouldLoadMoreData()) {
          // Trigger dynamic loading
          if (this.loadMoreCallback) {
            // Don't await here to prevent blocking the UI
            this.loadMoreCallback().catch(err => {
            });
          }
        }
      }
    });

    // Home/End keys for quick navigation
    this.screen.key(['home', 'g'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        this.uiState.setSelectedIndex(0);
        this.uiState.adjustViewport();
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['end', 'G'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        const count = this.uiState.getEventsCount();
        if (count > 0) {
          this.uiState.setSelectedIndex(count - 1);
          this.uiState.adjustViewport();
          this.updateDisplayCallback();
        }
      }
    });

    // Page up/down for faster navigation
    this.screen.key(['pageup'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        for (let i = 0; i < 10; i++) {
          this.uiState.moveSelectionUp();
        }
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['pagedown'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'normal' || state === 'paused' || state === 'filter' || state === 'search') {
        for (let i = 0; i < 10; i++) {
          this.uiState.moveSelectionDown();
        }
        this.updateDisplayCallback();
      }
    });
  }

  private enterFilterMode(): void {
    this.uiState.enterFilterMode();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  private enterSearchMode(): void {
    this.uiState.enterSearchMode();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  private exitSpecialMode(): void {
    this.uiState.exitSpecialMode();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
    
    // If filters/search were cleared, refresh data
    if (this.uiState.getDisplayState() === 'normal' || this.uiState.getDisplayState() === 'paused') {
      this.refreshDataCallback();
    }
  }

  private toggleEventFilter(eventType: EventType): void {
    this.uiState.toggleEventFilter(eventType);
    this.updateDynamicControlCallback();
    this.refreshDataCallback(); // Use smart refresh with filter mode detection
  }

  private applySearch(): void {
    this.uiState.applySearch();
    this.updateDynamicControlCallback();
    this.refreshDataCallback();
  }

  private switchDisplayMode(mode: 'all' | 'unique'): void {
    if (this.uiState.getDisplayMode() !== mode) {
      this.uiState.setDisplayMode(mode);
      // Direct refresh
      this.refreshDataCallback();
    }
  }

  private togglePause(): void {
    this.uiState.togglePause();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  // Getter for filter key map (used by other components)
  getFilterKeyMap(): { [key: string]: EventType } {
    return this.FILTER_KEY_MAP;
  }

  // Debounced search implementation
  private debouncedSearch(): void {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Reset selection to start when search text changes
    this.uiState.setSelectedIndex(0);

    // Set new timer
    this.searchDebounceTimer = setTimeout(() => {
      // Refresh to apply search filter
      this.refreshDataCallback();
    }, this.SEARCH_DEBOUNCE_MS);
  }

  // FUNC-202: New key handling methods for ESC/Enter functionality
  private discardEditsAndRestorePrevious(): void {
    this.uiState.restorePreviousState();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
    
    // Refresh data to apply restored state
    this.refreshDataCallback();
  }

  private confirmSearch(): void {
    this.uiState.confirmCurrentState();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
    
    // Refresh data to apply search
    this.refreshDataCallback();
  }

  private confirmFilter(): void {
    this.uiState.confirmCurrentState();
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
    
    // Refresh data to apply filter
    this.refreshDataCallback();
  }

  private executeDbSearch(): void {
    // FUNC-202: Shift+Enter behavior - execute database search
    this.uiState.applySearch(); // Use existing DB search logic
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
    
    // Refresh data to apply DB search
    this.refreshDataCallback();
  }
}
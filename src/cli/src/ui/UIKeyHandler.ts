/**
 * UI Key Handler
 * Manages all keyboard input and key bindings
 */

import * as blessed from 'blessed';
import { UIState } from './UIState';

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

  private readonly FILTER_KEY_MAP: { [key: string]: string } = {
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
    // Exit - q is disabled in search mode, but C-c always works
    this.screen.key(['q'], () => {
      if (this.uiState.getDisplayState() !== 'keyword_filter') {
        this.stopCallback();
        process.exit(0);
      }
    });
    
    this.screen.key(['C-c'], () => {
      this.stopCallback();
      process.exit(0);
    });

    // Escape - handle based on current mode
    this.screen.key(['escape'], () => {
      const state = this.uiState.getDisplayState();
      
      if (state === 'event_type_filter' || state === 'keyword_filter') {
        // Edit mode: cancel editing
        this.uiState.cancelEditing();
        this.updateDynamicControlCallback();
        this.updateStatusBarCallback();
        this.screen.render();
        this.refreshDataCallback();
      } else if (state === 'stream_live' || state === 'stream_paused') {
        // Normal mode: reset all filters
        this.uiState.resetAllFilters();
        this.updateDynamicControlCallback();
        this.updateStatusBarCallback();
        this.screen.render();
        this.refreshDataCallback();
      }
    });

    // Manual refresh
    this.screen.key(['x'], () => {
      if (this.uiState.getDisplayState() !== 'keyword_filter') {
        this.refreshDataCallback();
      }
    });

    // Pause/Resume
    this.screen.key(['space'], () => {
      if (this.uiState.getDisplayState() !== 'keyword_filter') {
        this.togglePause();
      }
    });
  }

  private setupModeKeys(): void {
    // Filter mode toggle
    this.screen.key(['f'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'stream_live' || state === 'stream_paused') {
        this.enterFilterMode();
      } else if (state === 'event_type_filter') {
        this.toggleEventFilter('find');
      }
    });

    // Search mode
    this.screen.key(['/'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'stream_live' || state === 'stream_paused') {
        this.enterSearchMode();
      }
    });

    // Search mode character input
    this.screen.on('keypress', (ch: string, key: any) => {
      if (this.uiState.getDisplayState() === 'keyword_filter') {
        if (key && key.name === 'backspace') {
          this.uiState.backspaceSearchPattern();
          this.updateDynamicControlCallback();
          this.updateStatusBarCallback();
          this.screen.render();
          // Use debounced search
          this.debouncedSearch();
        } else if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
          // Filter out control characters (including \r, \n, etc.)
          if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126) {
            this.uiState.appendToSearchPattern(ch);
            this.updateDynamicControlCallback();
            this.updateStatusBarCallback();
            this.screen.render();
            // Use debounced search
            this.debouncedSearch();
          }
        }
      }
    });

    // Enter - confirm editing
    this.screen.key(['enter'], () => {
      const state = this.uiState.getDisplayState();
      if (state === 'event_type_filter' || state === 'keyword_filter') {
        this.uiState.confirmEditing();
        this.updateDynamicControlCallback();
        this.updateStatusBarCallback();
        this.screen.render();
        this.refreshDataCallback();
      }
    });

    // Display mode switching
    this.screen.key(['a'], () => {
      if (this.uiState.getDisplayState() !== 'keyword_filter') {
        this.switchDisplayMode('all');
      }
    });

    this.screen.key(['u'], () => {
      if (this.uiState.getDisplayState() !== 'keyword_filter') {
        this.switchDisplayMode('unique');
      }
    });
  }

  private setupFilterKeys(): void {
    const filterKeyMap = { ...this.FILTER_KEY_MAP };
    delete filterKeyMap.f; // 'f' is handled in setupModeKeys

    Object.entries(filterKeyMap).forEach(([key, eventType]) => {
      this.screen.key([key], () => {
        if (this.uiState.getDisplayState() === 'event_type_filter') {
          this.toggleEventFilter(eventType);
        }
      });
    });
  }

  private setupNavigationKeys(): void {
    // Up/down navigation
    this.screen.key(['up', 'k'], () => {
      const state = this.uiState.getDisplayState();
      if (state !== 'detail') {
        this.uiState.moveSelectionUp();
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['down', 'j'], async () => {
      const state = this.uiState.getDisplayState();
      if (state !== 'detail') {
        const currentIndex = this.uiState.getSelectedIndex();
        const eventsCount = this.uiState.getEventsCount();
        
        // Extra safety check to prevent wrapping
        if (currentIndex >= eventsCount - 1) {
          return;
        }
        
        this.uiState.moveSelectionDown();
        this.updateDisplayCallback();
        
        // Check if we need to load more data
        if (this.uiState.shouldLoadMoreData()) {
          if (this.loadMoreCallback) {
            // Don't await here to prevent blocking the UI
            this.loadMoreCallback().catch(err => {
              // Silently handle error
            });
          }
        }
      }
    });

    // Home/End keys for quick navigation
    this.screen.key(['home', 'g'], () => {
      const state = this.uiState.getDisplayState();
      if (state !== 'detail') {
        this.uiState.setSelectedIndex(0);
        this.uiState.adjustViewport();
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['end', 'G'], () => {
      const state = this.uiState.getDisplayState();
      if (state !== 'detail') {
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
      if (state !== 'detail') {
        for (let i = 0; i < 10; i++) {
          this.uiState.moveSelectionUp();
        }
        this.updateDisplayCallback();
      }
    });

    this.screen.key(['pagedown'], () => {
      const state = this.uiState.getDisplayState();
      if (state !== 'detail') {
        for (let i = 0; i < 10; i++) {
          this.uiState.moveSelectionDown();
        }
        this.updateDisplayCallback();
      }
    });
  }

  private enterFilterMode(): void {
    this.uiState.startEditing('event_type_filter');
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  private enterSearchMode(): void {
    this.uiState.startEditing('keyword_filter');
    this.updateDynamicControlCallback();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  private toggleEventFilter(eventType: string): void {
    this.uiState.toggleEventFilter(eventType);
    this.updateDynamicControlCallback();
    this.refreshDataCallback();
  }

  private switchDisplayMode(mode: 'all' | 'unique'): void {
    if (this.uiState.getDisplayMode() !== mode) {
      this.uiState.setDisplayMode(mode);
      this.refreshDataCallback();
    }
  }

  private togglePause(): void {
    this.uiState.togglePause();
    this.updateStatusBarCallback();
    this.screen.render();
  }

  // Getter for filter key map (used by other components)
  getFilterKeyMap(): { [key: string]: string } {
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
}
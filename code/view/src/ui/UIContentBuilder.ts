/**
 * UI Content Builder
 * Builds text content for UI panels based on current state
 */

import { UIState } from './UIState';
import { KeywordSearchManager } from '../search';
import { EventTableViewport } from './interfaces/EventTableViewport';
import { UI_LAYOUT } from './UIConstants';

export class UIContentBuilder {
  constructor(
    private uiState: UIState,
    private eventTable: EventTableViewport
  ) {}

  buildHeaderContent(): string {
    let header = `{bold}cctop v0.5.0.0 ${this.uiState.getDaemonStatus()}`;

    const searchPattern = this.uiState.getSearchPattern();
    if (searchPattern) {
      const normalizedText = KeywordSearchManager.getDisplayText(searchPattern);
      header += ` │ Keyword: ${normalizedText}`;
    }

    header += `{/bold}\n`;
    header += this.eventTable.getColumnHeader();

    return header;
  }

  buildCommandLine1(): string {
    const pauseText = this.uiState.isPausedState() ? 'Resume' : 'Pause';
    const displayMode = this.uiState.getDisplayMode();
    const isSearchMode = this.uiState.getDisplayState() === 'keyword_filter';

    if (isSearchMode) {
      const allText = displayMode === 'all' ? '{green-fg}[a] All{/green-fg}' : '{gray-fg}[a] All{/gray-fg}';
      const uniqueText = displayMode === 'unique' ? '{green-fg}[u] Unique{/green-fg}' : '{gray-fg}[u] Unique{/gray-fg}';
      return `{gray-fg}[q] Exit  [space] ${pauseText}  [x] Refresh{/gray-fg}  ${allText}  ${uniqueText}`;
    }

    const allText = displayMode === 'all' ? '{green-fg}[a] All{/green-fg}' : '[a] All';
    const uniqueText = displayMode === 'unique' ? '{green-fg}[u] Unique{/green-fg}' : '[u] Unique';
    return `[q] Exit  [space] ${pauseText}  [x] Refresh  ${allText}  ${uniqueText}`;
  }

  buildKeyGuideContent(): string {
    const displayState = this.uiState.getDisplayState();

    switch (displayState) {
      case 'event_type_filter':
      case 'keyword_filter':
        return '[Enter] Confirm Filter [ESC] Cancel Back [↑↓] Select an Event';

      case 'stream_live':
      case 'stream_paused':
      default:
        return '[ESC] Reset All Filters [↑↓] Select an Event';
    }
  }

  buildDynamicControlContent(): string {
    const displayState = this.uiState.getDisplayState();
    const searchPattern = this.uiState.getSearchPattern();

    switch (displayState) {
      case 'event_type_filter':
        return this.buildFilterModeDisplay();

      case 'keyword_filter':
        const normalizedSearchText = KeywordSearchManager.getDisplayText(searchPattern);
        const paddingLength = Math.max(0, UI_LAYOUT.MAX_SEARCH_LENGTH - normalizedSearchText.length);
        const padding = '_'.repeat(paddingLength);
        return `{bold}{yellow-fg}Keyword: [${normalizedSearchText}${padding}] [Shift+Enter] Search DB{/yellow-fg}{/bold}`;

      case 'stream_live':
      case 'stream_paused':
      default:
        return '{bold}{yellow-fg}[f] Event-Type Filter  [/] Keyword Filter{/yellow-fg}{/bold}';
    }
  }

  buildFilterModeDisplay(): string {
    const FILTER_KEY_MAP: { [key: string]: string } = {
      'f': 'find',
      'c': 'create',
      'm': 'modify',
      'd': 'delete',
      'v': 'move',
      'r': 'restore'
    };

    const filterItems = Object.entries(FILTER_KEY_MAP).map(([key, type]) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const isEnabled = this.uiState.getEventTypeFilters().isEventTypeEnabled(type);

      if (isEnabled) {
        return `{bold}{yellow-fg}[${key}] ${label}{/yellow-fg}{/bold}`;
      } else {
        return `{bold}{gray-fg}[${key}] ${label}{/gray-fg}{/bold}`;
      }
    });

    return filterItems.join(' ');
  }
}

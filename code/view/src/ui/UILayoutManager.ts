/**
 * UI Layout Manager
 * Manages UI components and layout structure
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import * as blessed from 'blessed';
import { UIState } from './UIState';
import { EventTable } from './components/EventTable';
import { ViewConfig } from '../config/ViewConfig';
import { EventTableViewport } from './interfaces/EventTableViewport';
import { UIContentBuilder } from './UIContentBuilder';
import { UI_LAYOUT } from './UIConstants';

export class UILayoutManager {
  private screen: blessed.Widgets.Screen;
  private uiState: UIState;
  private viewConfig?: ViewConfig;
  private contentBuilder!: UIContentBuilder;

  // UI Components
  private headerPanel: any;
  private headerSeparator: any;
  private statusBar: any;
  private keyGuideBar: any;
  private dynamicControlBar: any;
  private separatorLine: any;
  private eventArea: any;
  private eventTable!: EventTableViewport;

  constructor(screen: blessed.Widgets.Screen, uiState: UIState, viewConfig?: ViewConfig) {
    this.screen = screen;
    this.uiState = uiState;
    this.viewConfig = viewConfig;
  }

  setupFramelessLayout(): void {
    this.eventArea = blessed.box({
      top: UI_LAYOUT.EVENT_AREA_TOP,
      left: 0,
      width: '100%',
      height: UI_LAYOUT.EVENT_AREA_HEIGHT,
      style: { fg: 'white', bg: 'transparent' }
    });

    this.eventTable = new EventTable({
      parent: this.eventArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      viewConfig: this.viewConfig,
      style: { fg: 'white', bg: 'transparent' }
    }, this.screen.width as number || UI_LAYOUT.DEFAULT_TERMINAL_WIDTH);

    this.contentBuilder = new UIContentBuilder(this.uiState, this.eventTable);

    this.headerPanel = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: UI_LAYOUT.HEADER_HEIGHT,
      content: this.contentBuilder.buildHeaderContent(),
      style: { fg: 'white', bg: 'transparent' },
      tags: true
    });

    this.headerSeparator = blessed.box({
      top: UI_LAYOUT.HEADER_SEPARATOR_TOP,
      left: 0,
      width: '100%',
      height: 1,
      content: '─'.repeat(UI_LAYOUT.DEFAULT_TERMINAL_WIDTH),
      style: { fg: 'white', bg: 'transparent' }
    });

    this.separatorLine = blessed.box({
      bottom: UI_LAYOUT.SEPARATOR_BOTTOM,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: { fg: 'white', bg: 'transparent' }
    });

    this.statusBar = blessed.box({
      bottom: UI_LAYOUT.STATUS_BAR_BOTTOM,
      left: 0,
      width: '100%',
      height: 1,
      content: this.contentBuilder.buildCommandLine1(),
      style: { fg: 'white', bg: 'transparent', bold: true },
      tags: true
    });

    this.keyGuideBar = blessed.box({
      bottom: UI_LAYOUT.KEY_GUIDE_BOTTOM,
      left: 0,
      width: '100%',
      height: 1,
      content: '[↑↓] Select an event',
      style: { fg: 'white', bg: 'transparent', bold: true },
      tags: true
    });

    this.dynamicControlBar = blessed.text({
      bottom: UI_LAYOUT.CONTROL_BAR_BOTTOM,
      left: 0,
      width: '100%',
      height: 1,
      content: this.contentBuilder.buildDynamicControlContent(),
      style: { bg: 'transparent', fg: 'white' },
      tags: true
    });

    this.screen.append(this.headerPanel);
    this.screen.append(this.headerSeparator);
    this.screen.append(this.eventArea);
    this.screen.append(this.separatorLine);
    this.screen.append(this.statusBar);
    this.screen.append(this.keyGuideBar);
    this.screen.append(this.dynamicControlBar);
  }

  setViewConfig(newViewConfig: ViewConfig): void {
    this.viewConfig = newViewConfig;
    if (this.eventTable && typeof this.eventTable.setViewConfig === 'function') {
      this.eventTable.setViewConfig(newViewConfig);
    }
  }

  updateDynamicControl(): void {
    const content = this.contentBuilder.buildDynamicControlContent();
    this.dynamicControlBar.setContent((blessed as any).parseTags(content));
    this.screen.render();
  }

  updateStatusBar(): void {
    this.statusBar.setContent(this.contentBuilder.buildCommandLine1());
    this.keyGuideBar.setContent(this.contentBuilder.buildKeyGuideContent());
    this.headerPanel.setContent(this.contentBuilder.buildHeaderContent());

    const terminalWidth = process.stdout.columns || UI_LAYOUT.DEFAULT_TERMINAL_WIDTH;
    this.headerSeparator.setContent('─'.repeat(terminalWidth));
    this.separatorLine.setContent('─'.repeat(terminalWidth));

    this.screen.render();
  }

  updateDisplay(): void {
    this.uiState.calculateDynamicWidth();
    this.eventTable.updateScreenWidth(this.screen.width as number || UI_LAYOUT.DEFAULT_TERMINAL_WIDTH);

    const visibleEvents = this.uiState.getVisibleEvents();
    const absoluteSelectedIndex = this.uiState.getSelectedIndex();
    const viewportStart = this.uiState.getViewportStartIndex();
    const selectedIndex = absoluteSelectedIndex - viewportStart;

    const hasMoreData = this.uiState.hasMoreDataToLoad();
    this.eventTable.updateContent(visibleEvents, selectedIndex, hasMoreData);
    this.eventTable.refresh();

    this.updateStatusBar();
    this.screen.render();
  }

  getEventList(): any { return this.eventTable.getBox(); }
  getHeaderPanel(): any { return this.headerPanel; }
  getStatusBar(): any { return this.statusBar; }
  getDynamicControlBar(): any { return this.dynamicControlBar; }
  getSeparatorLine(): any { return this.separatorLine; }
}

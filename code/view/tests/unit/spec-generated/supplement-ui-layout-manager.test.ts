/**
 * UILayoutManager Unit Tests (from spec: supplement-ui-layout-manager.md)
 * Tests layout structure and updateDisplay flow not covered by blessed-ui-*.test.ts
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as blessed from 'blessed';
import { UILayoutManager } from '../../../src/ui/UILayoutManager';
import { UIState } from '../../../src/ui/UIState';
import { UI_LAYOUT } from '../../../src/ui/UIConstants';

// Mock blessed
vi.mock('blessed', () => {
  const mockElement = () => ({
    setContent: vi.fn(),
    style: {},
    on: vi.fn(),
  });

  return {
    default: {
      box: vi.fn(() => mockElement()),
      text: vi.fn(() => mockElement()),
      parseTags: vi.fn((content: string) => content.replace(/\{[^}]+\}/g, '')),
    },
    box: vi.fn(() => mockElement()),
    text: vi.fn(() => mockElement()),
    parseTags: vi.fn((content: string) => content.replace(/\{[^}]+\}/g, '')),
  };
});

// Mock EventTable
vi.mock('../../../src/ui/components/EventTable', () => ({
  EventTable: vi.fn().mockImplementation(() => ({
    getColumnHeader: vi.fn().mockReturnValue('HEADER'),
    updateContent: vi.fn(),
    updateScreenWidth: vi.fn(),
    refresh: vi.fn(),
    getBox: vi.fn().mockReturnValue({}),
    getViewportInfo: vi.fn().mockReturnValue({ selectedIndex: 0, totalEvents: 0 }),
    destroy: vi.fn(),
    setViewConfig: vi.fn(),
  })),
}));

// Mock UIContentBuilder
vi.mock('../../../src/ui/UIContentBuilder', () => ({
  UIContentBuilder: vi.fn().mockImplementation(() => ({
    buildHeaderContent: vi.fn().mockReturnValue('header'),
    buildCommandLine1: vi.fn().mockReturnValue('status'),
    buildKeyGuideContent: vi.fn().mockReturnValue('key-guide'),
    buildDynamicControlContent: vi.fn().mockReturnValue('{bold}dynamic{/bold}'),
  })),
}));

// Mock search module
vi.mock('../../../src/search', () => ({
  KeywordSearchManager: {
    getDisplayText: vi.fn((text: string) => text),
  },
}));

function createMockScreen() {
  return {
    append: vi.fn(),
    render: vi.fn(),
    width: 120,
    on: vi.fn(),
    key: vi.fn(),
  };
}

describe('UILayoutManager', () => {
  let manager: UILayoutManager;
  let uiState: UIState;
  let screen: ReturnType<typeof createMockScreen>;

  beforeEach(() => {
    vi.clearAllMocks();
    uiState = new UIState();
    screen = createMockScreen();
    manager = new UILayoutManager(screen as any, uiState);
  });

  describe('setupFramelessLayout', () => {
    it('should create all UI components', () => {

      manager.setupFramelessLayout();

      // Should create blessed boxes for all components
      expect(blessed.box).toHaveBeenCalled();
      expect(blessed.text).toHaveBeenCalled();
    });

    it('should append all components to screen', () => {
      manager.setupFramelessLayout();

      // headerPanel, headerSeparator, eventArea, separatorLine,
      // statusBar, keyGuideBar, dynamicControlBar = 7 appends
      expect(screen.append).toHaveBeenCalledTimes(7);
    });

    it('should create components with correct layout positions', () => {

      manager.setupFramelessLayout();

      // Verify header panel at top: 0
      const headerCall = blessed.box.mock.calls.find(
        (call: any[]) => call[0].top === 0 && call[0].height === UI_LAYOUT.HEADER_HEIGHT
      );
      expect(headerCall).toBeDefined();

      // Verify header separator at correct position
      const separatorCall = blessed.box.mock.calls.find(
        (call: any[]) => call[0].top === UI_LAYOUT.HEADER_SEPARATOR_TOP
      );
      expect(separatorCall).toBeDefined();
    });
  });

  describe('updateDisplay', () => {
    beforeEach(() => {
      manager.setupFramelessLayout();
    });

    it('should recalculate dynamic width via uiState', () => {
      const spy = vi.spyOn(uiState, 'calculateDynamicWidth');
      manager.updateDisplay();
      expect(spy).toHaveBeenCalled();
    });

    it('should render screen after update', () => {
      manager.updateDisplay();
      expect(screen.render).toHaveBeenCalled();
    });

    it('should update event table with visible events', () => {
      uiState.setEvents([
        {
          id: 1,
          timestamp: 123,
          filename: 'test.ts',
          directory: '/src',
          event_type: 'modify',
          size: 100,
          lines: 10,
          blocks: 1,
          inode: 1,
          elapsed_ms: 500,
        },
      ]);
      manager.updateDisplay();
      // Should not throw and should render
      expect(screen.render).toHaveBeenCalled();
    });
  });

  describe('updateDynamicControl', () => {
    beforeEach(() => {
      manager.setupFramelessLayout();
    });

    it('should use blessed.parseTags for dynamic control content', () => {

      manager.updateDynamicControl();
      expect(blessed.parseTags).toHaveBeenCalled();
    });

    it('should render screen after update', () => {
      manager.updateDynamicControl();
      expect(screen.render).toHaveBeenCalled();
    });
  });

  describe('updateStatusBar', () => {
    beforeEach(() => {
      manager.setupFramelessLayout();
    });

    it('should render screen after status bar update', () => {
      manager.updateStatusBar();
      expect(screen.render).toHaveBeenCalled();
    });
  });

  describe('setViewConfig', () => {
    beforeEach(() => {
      manager.setupFramelessLayout();
    });

    it('should update view config on event table', () => {
      const newConfig = { columns: [] } as any;
      // Should not throw
      expect(() => manager.setViewConfig(newConfig)).not.toThrow();
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      manager.setupFramelessLayout();
    });

    it('should return event list via getEventList', () => {
      expect(manager.getEventList()).toBeDefined();
    });

    it('should return header panel via getHeaderPanel', () => {
      expect(manager.getHeaderPanel()).toBeDefined();
    });

    it('should return status bar via getStatusBar', () => {
      expect(manager.getStatusBar()).toBeDefined();
    });

    it('should return dynamic control bar via getDynamicControlBar', () => {
      expect(manager.getDynamicControlBar()).toBeDefined();
    });

    it('should return separator line via getSeparatorLine', () => {
      expect(manager.getSeparatorLine()).toBeDefined();
    });
  });
});

describe('UI_LAYOUT constants', () => {
  it('should define all required layout constants', () => {
    expect(UI_LAYOUT.HEADER_HEIGHT).toBeDefined();
    expect(UI_LAYOUT.HEADER_SEPARATOR_TOP).toBeDefined();
    expect(UI_LAYOUT.EVENT_AREA_TOP).toBeDefined();
    expect(UI_LAYOUT.EVENT_AREA_HEIGHT).toBeDefined();
    expect(UI_LAYOUT.SEPARATOR_BOTTOM).toBeDefined();
    expect(UI_LAYOUT.STATUS_BAR_BOTTOM).toBeDefined();
    expect(UI_LAYOUT.KEY_GUIDE_BOTTOM).toBeDefined();
    expect(UI_LAYOUT.CONTROL_BAR_BOTTOM).toBeDefined();
    expect(UI_LAYOUT.DEFAULT_TERMINAL_WIDTH).toBeDefined();
  });

  it('should have correct component stacking order', () => {
    // Bottom components: control=0, guide=1, status=2, separator=3
    expect(UI_LAYOUT.CONTROL_BAR_BOTTOM).toBe(0);
    expect(UI_LAYOUT.KEY_GUIDE_BOTTOM).toBe(1);
    expect(UI_LAYOUT.STATUS_BAR_BOTTOM).toBe(2);
    expect(UI_LAYOUT.SEPARATOR_BOTTOM).toBe(3);
  });
});

/**
 * UIViewportState Unit Tests (from spec: ui-viewport-state.md)
 * Tests boundary conditions not covered by navigation-behavior.test.ts
 * navigation-behavior.test.ts tests via UIState; these test UIViewportState directly
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UIViewportState } from '../../../src/ui/state/UIViewportState';

describe('UIViewportState', () => {
  let viewport: UIViewportState;

  beforeEach(() => {
    viewport = new UIViewportState();
  });

  describe('Initial state', () => {
    it('should start with selectedIndex 0', () => {
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should start with viewportStartIndex 0', () => {
      expect(viewport.getViewportStartIndex()).toBe(0);
    });

    it('should start with default viewportHeight 20', () => {
      expect(viewport.getViewportHeight()).toBe(20);
    });
  });

  describe('setSelectedIndex - Bounds Checking', () => {
    it('should clamp index to [0, total-1]', () => {
      viewport.setSelectedIndex(5, 10);
      expect(viewport.getSelectedIndex()).toBe(5);
    });

    it('should clamp negative index to 0', () => {
      viewport.setSelectedIndex(-5, 10);
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should clamp index exceeding total to total-1', () => {
      viewport.setSelectedIndex(15, 10);
      expect(viewport.getSelectedIndex()).toBe(9);
    });

    it('should handle total of 0', () => {
      viewport.setSelectedIndex(0, 0);
      // max(0, min(0, -1)) = 0
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should handle total of 1', () => {
      viewport.setSelectedIndex(0, 1);
      expect(viewport.getSelectedIndex()).toBe(0);

      viewport.setSelectedIndex(5, 1);
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should call adjustViewportForSelection after setting index', () => {
      viewport.setViewportHeight(5);

      // Select beyond viewport end
      viewport.setSelectedIndex(7, 20);
      // Viewport should adjust to show index 7
      expect(viewport.getViewportStartIndex()).toBeGreaterThan(0);
    });
  });

  describe('Viewport Adjustment', () => {
    beforeEach(() => {
      viewport.setViewportHeight(5);
    });

    it('should scroll up when selectedIndex < viewportStartIndex', () => {
      // First move down to shift viewport
      viewport.setSelectedIndex(6, 20);
      // viewportStartIndex should be 2 (6 - 5 + 1)
      expect(viewport.getViewportStartIndex()).toBe(2);

      // Now select above viewport
      viewport.setSelectedIndex(1, 20);
      expect(viewport.getViewportStartIndex()).toBe(1);
    });

    it('should scroll down when selectedIndex > viewportStartIndex + viewportHeight - 1', () => {
      viewport.setSelectedIndex(6, 20);
      // viewport end = start + height - 1 = 2 + 5 - 1 = 6
      expect(viewport.getSelectedIndex()).toBe(6);
      expect(viewport.getViewportStartIndex()).toBe(2);
    });

    it('should clamp viewportStartIndex to maxViewportStart', () => {
      // With 7 total events and viewport height 5, max start = 2
      viewport.setSelectedIndex(6, 7);
      expect(viewport.getViewportStartIndex()).toBeLessThanOrEqual(2);
    });

    it('should not adjust viewport when selection is within visible range', () => {
      viewport.setSelectedIndex(0, 20);
      expect(viewport.getViewportStartIndex()).toBe(0);

      viewport.setSelectedIndex(3, 20);
      // Still within [0, 4], no adjustment needed
      expect(viewport.getViewportStartIndex()).toBe(0);
    });
  });

  describe('setViewportHeight', () => {
    it('should update viewport height', () => {
      viewport.setViewportHeight(30);
      expect(viewport.getViewportHeight()).toBe(30);
    });

    it('should enforce minimum height of 1', () => {
      viewport.setViewportHeight(0);
      expect(viewport.getViewportHeight()).toBe(1);

      viewport.setViewportHeight(-5);
      expect(viewport.getViewportHeight()).toBe(1);
    });
  });

  describe('getVisibleSlice', () => {
    it('should return correct slice of events', () => {
      viewport.setViewportHeight(3);
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const slice = viewport.getVisibleSlice(items);
      expect(slice).toEqual([1, 2, 3]);
    });

    it('should return correct slice after scrolling', () => {
      viewport.setViewportHeight(3);
      viewport.setSelectedIndex(5, 10);
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const slice = viewport.getVisibleSlice(items);
      // viewportStart should be 3 (5 - 3 + 1)
      expect(slice).toEqual([4, 5, 6]);
    });

    it('should handle empty array', () => {
      const slice = viewport.getVisibleSlice([]);
      expect(slice).toEqual([]);
    });

    it('should handle array shorter than viewport height', () => {
      viewport.setViewportHeight(10);
      const items = [1, 2, 3];

      const slice = viewport.getVisibleSlice(items);
      expect(slice).toEqual([1, 2, 3]);
    });

    it('should handle array of exact viewport height', () => {
      viewport.setViewportHeight(5);
      const items = [1, 2, 3, 4, 5];

      const slice = viewport.getVisibleSlice(items);
      expect(slice).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getRelativeSelectedIndex', () => {
    it('should return 0 when at viewport start', () => {
      expect(viewport.getRelativeSelectedIndex()).toBe(0);
    });

    it('should return offset from viewport start', () => {
      viewport.setViewportHeight(5);
      viewport.setSelectedIndex(3, 10);
      // viewportStart is still 0, relative = 3 - 0 = 3
      expect(viewport.getRelativeSelectedIndex()).toBe(3);
    });

    it('should return correct relative index after scrolling', () => {
      viewport.setViewportHeight(5);
      viewport.setSelectedIndex(7, 20);
      // viewportStart = 3 (7 - 5 + 1), relative = 7 - 3 = 4
      expect(viewport.getRelativeSelectedIndex()).toBe(4);
    });
  });

  describe('moveSelectionUp', () => {
    it('should decrease selected index by 1', () => {
      viewport.setSelectedIndex(5, 10);
      viewport.moveSelectionUp(10);
      expect(viewport.getSelectedIndex()).toBe(4);
    });

    it('should not go below 0', () => {
      viewport.setSelectedIndex(0, 10);
      viewport.moveSelectionUp(10);
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should adjust viewport when moving above visible area', () => {
      viewport.setViewportHeight(3);
      viewport.setSelectedIndex(5, 10); // viewportStart = 3
      viewport.setSelectedIndex(3, 10); // at viewportStart

      viewport.moveSelectionUp(10); // index 2, below viewport start
      expect(viewport.getViewportStartIndex()).toBe(2);
    });
  });

  describe('moveSelectionDown', () => {
    it('should increase selected index by 1', () => {
      viewport.setSelectedIndex(0, 10);
      viewport.moveSelectionDown(10);
      expect(viewport.getSelectedIndex()).toBe(1);
    });

    it('should not exceed total - 1', () => {
      viewport.setSelectedIndex(9, 10);
      viewport.moveSelectionDown(10);
      expect(viewport.getSelectedIndex()).toBe(9);
    });

    it('should adjust viewport when moving below visible area', () => {
      viewport.setViewportHeight(3);
      viewport.setSelectedIndex(2, 10); // at viewport end (0+3-1=2)

      viewport.moveSelectionDown(10); // index 3, beyond viewport
      expect(viewport.getViewportStartIndex()).toBe(1);
    });
  });

  describe('isTopRowVisible', () => {
    it('should return true when viewportStartIndex is 0', () => {
      expect(viewport.isTopRowVisible()).toBe(true);
    });

    it('should return false when scrolled down', () => {
      viewport.setViewportHeight(3);
      viewport.setSelectedIndex(5, 10);
      expect(viewport.isTopRowVisible()).toBe(false);
    });
  });

  describe('resetViewport', () => {
    it('should reset selectedIndex to 0', () => {
      viewport.setSelectedIndex(5, 10);
      viewport.resetViewport();
      expect(viewport.getSelectedIndex()).toBe(0);
    });

    it('should reset viewportStartIndex to 0', () => {
      viewport.setViewportHeight(3);
      viewport.setSelectedIndex(5, 10);
      viewport.resetViewport();
      expect(viewport.getViewportStartIndex()).toBe(0);
    });
  });

  describe('getViewportInfo', () => {
    it('should return all viewport state fields', () => {
      const info = viewport.getViewportInfo();
      expect(info).toEqual({
        selectedIndex: 0,
        viewportStartIndex: 0,
        viewportHeight: 20,
        relativeSelectedIndex: 0,
      });
    });

    it('should reflect current state after operations', () => {
      viewport.setViewportHeight(5);
      viewport.setSelectedIndex(7, 20);
      const info = viewport.getViewportInfo();

      expect(info.selectedIndex).toBe(7);
      expect(info.viewportHeight).toBe(5);
      expect(info.viewportStartIndex).toBe(3);
      expect(info.relativeSelectedIndex).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid up/down at boundary', () => {
      viewport.setViewportHeight(3);
      // Move to bottom
      for (let i = 0; i < 15; i++) {
        viewport.moveSelectionDown(10);
      }
      expect(viewport.getSelectedIndex()).toBe(9);

      // Move back to top
      for (let i = 0; i < 15; i++) {
        viewport.moveSelectionUp(10);
      }
      expect(viewport.getSelectedIndex()).toBe(0);
      expect(viewport.getViewportStartIndex()).toBe(0);
    });

    it('should handle viewport height larger than total events', () => {
      viewport.setViewportHeight(100);
      viewport.setSelectedIndex(3, 5);
      expect(viewport.getSelectedIndex()).toBe(3);
      expect(viewport.getViewportStartIndex()).toBe(0);
    });

    it('should handle viewport height of 1', () => {
      viewport.setViewportHeight(1);
      viewport.setSelectedIndex(5, 10);
      expect(viewport.getViewportStartIndex()).toBe(5);

      const slice = viewport.getVisibleSlice([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(slice).toEqual([5]);
    });

    it('should handle typed generic with getVisibleSlice', () => {
      viewport.setViewportHeight(3);
      const objects = [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }];
      const slice = viewport.getVisibleSlice(objects);
      expect(slice).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    });
  });
});

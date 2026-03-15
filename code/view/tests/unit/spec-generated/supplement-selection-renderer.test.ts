/**
 * SelectionRenderer Tests
 * Tests for row selection styling utilities
 * Based on: documents/spec/view/supplement-selection-renderer.md (SPEC-V-SUP-021)
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { SelectionRenderer } from '../../../src/ui/components/EventTable/renderers/SelectionRenderer';

describe('SelectionRenderer', () => {
  describe('applySelection', () => {
    it('should wrap content with {blue-bg}...{/blue-bg} when isSelected is true', () => {
      const content = 'some row content';
      const result = SelectionRenderer.applySelection(content, true);

      expect(result).toBe('{blue-bg}some row content{/blue-bg}');
    });

    it('should return content unchanged when isSelected is false', () => {
      const content = 'some row content';
      const result = SelectionRenderer.applySelection(content, false);

      expect(result).toBe('some row content');
    });

    it('should handle empty string content', () => {
      expect(SelectionRenderer.applySelection('', true)).toBe('{blue-bg}{/blue-bg}');
      expect(SelectionRenderer.applySelection('', false)).toBe('');
    });

    it('should handle content that already contains blessed tags', () => {
      const content = '{green-fg}text{/green-fg}';
      const result = SelectionRenderer.applySelection(content, true);

      expect(result).toBe('{blue-bg}{green-fg}text{/green-fg}{/blue-bg}');
    });
  });

  describe('applyNormalStyle', () => {
    it('should wrap content with {green-fg}...{/green-fg}', () => {
      const content = 'normal row';
      const result = SelectionRenderer.applyNormalStyle(content);

      expect(result).toBe('{green-fg}normal row{/green-fg}');
    });

    it('should handle empty string content', () => {
      const result = SelectionRenderer.applyNormalStyle('');

      expect(result).toBe('{green-fg}{/green-fg}');
    });
  });

  describe('shouldHighlight', () => {
    it('should return true when rowIndex equals selectedIndex', () => {
      expect(SelectionRenderer.shouldHighlight(0, 0)).toBe(true);
      expect(SelectionRenderer.shouldHighlight(5, 5)).toBe(true);
      expect(SelectionRenderer.shouldHighlight(100, 100)).toBe(true);
    });

    it('should return false when rowIndex does not equal selectedIndex', () => {
      expect(SelectionRenderer.shouldHighlight(0, 1)).toBe(false);
      expect(SelectionRenderer.shouldHighlight(5, 3)).toBe(false);
      expect(SelectionRenderer.shouldHighlight(10, 0)).toBe(false);
    });
  });
});

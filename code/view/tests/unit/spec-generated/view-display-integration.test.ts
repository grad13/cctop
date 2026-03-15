/**
 * View Display Integration - Performance & East Asian Integration Tests (Supplement)
 * Spec: documents/spec/view/view-display-integration.md
 * Covers: Section 15 (Performance Requirements), Section 3 (East Asian column widths)
 *
 * Existing coverage: blessed-ui-core.test.ts, blessed-ui-display-modes.test.ts
 * cover component init, mode switching, and basic event processing.
 * This file adds: performance timing, East Asian column integration.
 *
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { padOrTruncate, padLeft } from '../../../src/ui/components/EventTable/utils/stringUtils';
import stringWidth from 'string-width';

describe('View Display Integration - Performance & East Asian', () => {

  describe('Performance: 100ms update interval capability', () => {
    let uiState: UIState;

    beforeEach(() => {
      uiState = new UIState('all');
    });

    it('should be able to set and read events within 100ms budget', () => {
      // Generate 100 mock events
      const events = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2025-07-04 15:${String(i).padStart(2, '0')}:00`,
        event_type: 'modify',
        filename: `file${i}.ts`,
        directory: `src/components/module${i}`,
        lines: i * 10,
        blocks: i,
      }));

      const start = performance.now();
      uiState.setEvents(events);
      const readEvents = uiState.getEvents();
      const elapsed = performance.now() - start;

      expect(readEvents.length).toBe(100);
      expect(elapsed).toBeLessThan(100); // Must complete within 100ms
    });

    it('should handle display mode switch within 100ms', () => {
      const start = performance.now();
      uiState.setDisplayMode('unique');
      uiState.setDisplayMode('all');
      uiState.setDisplayMode('unique');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('East Asian Width column formatting integration', () => {
    const COLUMN_WIDTHS = {
      EVENT_TIMESTAMP: 19,
      ELAPSED: 9,
      FILE_NAME: 35,
      EVENT: 8,
      LINES: 6,
      BLOCKS: 8,
      SIZE: 7,
    };

    it('should format Event Timestamp column to exact 19 chars', () => {
      const timestamp = '2025-06-25 19:07:51';
      const result = padOrTruncate(timestamp, COLUMN_WIDTHS.EVENT_TIMESTAMP);
      expect(stringWidth(result)).toBe(19);
    });

    it('should format Elapsed column to exact 9 chars right-aligned', () => {
      const elapsed = '00:04';
      const result = padLeft(elapsed, COLUMN_WIDTHS.ELAPSED);
      expect(stringWidth(result)).toBe(9);
      // Right-aligned: spaces then value
      expect(result).toBe('    00:04');
    });

    it('should format File Name column with CJK to exact 35 chars', () => {
      const cjkFilename = 'FUNC-112-cli-display-inte日本語.md';
      const result = padOrTruncate(cjkFilename, COLUMN_WIDTHS.FILE_NAME);
      expect(stringWidth(result)).toBe(35);
    });

    it('should format Event column to exact 8 chars', () => {
      const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      for (const eventType of eventTypes) {
        const result = padOrTruncate(eventType, COLUMN_WIDTHS.EVENT);
        expect(stringWidth(result)).toBe(8);
      }
    });

    it('should format Lines column to exact 6 chars right-aligned', () => {
      const lines = '197';
      const result = padLeft(lines, COLUMN_WIDTHS.LINES);
      expect(stringWidth(result)).toBe(6);
      expect(result).toBe('   197');
    });

    it('should format Size column to exact 7 chars right-aligned', () => {
      const size = '15.2K';
      const result = padLeft(size, COLUMN_WIDTHS.SIZE);
      expect(stringWidth(result)).toBe(7);
      expect(result).toBe('  15.2K');
    });

    it('should produce aligned rows for mixed ASCII and CJK filenames', () => {
      const filenames = [
        'simple-file.ts',
        '日本語ファイル名.tsx',
        'FUNC-112-cli-display-integration-spec.md',
        'テスト界隈data.txt',
      ];

      const formattedWidths = filenames.map(fn =>
        stringWidth(padOrTruncate(fn, COLUMN_WIDTHS.FILE_NAME))
      );

      // All should be exactly the same width
      expect(new Set(formattedWidths).size).toBe(1);
      expect(formattedWidths[0]).toBe(35);
    });
  });

  describe('UIState display state transitions', () => {
    let uiState: UIState;

    beforeEach(() => {
      uiState = new UIState('all');
    });

    it('should map stream_live to normal display', () => {
      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(uiState.isPausedState()).toBe(false);
    });

    it('should map stream_paused to paused display', () => {
      uiState.togglePause();
      expect(uiState.getDisplayState()).toBe('stream_paused');
      expect(uiState.isPausedState()).toBe(true);
    });

    it('should map event_type_filter to filter display', () => {
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');
    });

    it('should map keyword_filter to search display', () => {
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });

    it('should transition Normal -> Filter -> Normal via confirm', () => {
      expect(uiState.getDisplayState()).toBe('stream_live');
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');
      uiState.confirmEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should transition Normal -> Search -> Normal via confirm', () => {
      expect(uiState.getDisplayState()).toBe('stream_live');
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
      uiState.confirmEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });
});

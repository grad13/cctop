/**
 * RowRenderer Tests
 * 
 * Tests for row rendering logic with formatting and selection highlighting
 */

import { RowRenderer } from '../../../../../../src/cli/src/ui/components/EventTable/renderers/RowRenderer';
import { EventRow } from '../../../../../../src/cli/src/types/event-row';

describe('RowRenderer', () => {
  const mockEvent: EventRow = {
    id: 1,
    timestamp: new Date('2025-01-11T10:00:00Z'),
    fileName: 'test-file-with-long-name-that-should-be-truncated.js',
    directory: '/very/long/path/that/should/be/truncated/from/the/beginning/project/src',
    eventType: 'create',
    size: 1024 * 1024, // 1MB
    lines: 100,
    blocks: 8,
    inode: 12345,
    device: 16777220,
    mode: 33188,
    uid: 501,
    gid: 20,
    rdev: 0,
    birthtimeMs: 1736592000000,
    searchKeyword: null,
    isHighlighted: false
  };

  describe('renderRow', () => {
    it('should render a non-selected row with green foreground', () => {
      const result = RowRenderer.renderRow(mockEvent, 0, 0, -1, 40);
      
      // Should contain green foreground tags
      expect(result).toContain('{green-fg}');
      expect(result).toContain('{/green-fg}');
      
      // Should not contain blue background
      expect(result).not.toContain('{blue-bg}');
    });

    it('should render a selected row with blue background', () => {
      const result = RowRenderer.renderRow(mockEvent, 0, 0, 0, 40);
      
      // Should contain blue background tags
      expect(result).toContain('{blue-bg}');
      expect(result).toContain('{/blue-bg}');
      
      // Should not contain green foreground
      expect(result).not.toContain('{green-fg}');
    });

    it('should format all columns correctly', () => {
      const result = RowRenderer.renderRow(mockEvent, 0, 0, -1, 40);
      
      // Remove color codes for easier testing
      const stripped = result.replace(/\{[^}]+\}/g, '');
      
      // Check timestamp format (19 chars)
      expect(stripped.substring(0, 19)).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
      
      // Check that the row has expected length (accounting for spaces)
      // Fixed columns: 19 + 1 + 9 + 1 + 35 + 1 + 8 + 1 + 6 + 1 + 8 + 1 + 7 + 1 = 99
      // Plus directory width: 40
      // Total: 139
      expect(stripped.length).toBe(139);
    });

    it('should truncate long filenames', () => {
      const result = RowRenderer.renderRow(mockEvent, 0, 0, -1, 40);
      const stripped = result.replace(/\{[^}]+\}/g, '');
      
      // Filename column starts at position 30 (19 + 1 + 9 + 1)
      const filenameColumn = stripped.substring(30, 65); // 35 chars
      expect(filenameColumn.length).toBe(35);
      
      // Should be truncated with ellipsis
      expect(filenameColumn).toContain('...');
    });

    it('should truncate directory paths from the beginning', () => {
      const result = RowRenderer.renderRow(mockEvent, 0, 0, -1, 40);
      const stripped = result.replace(/\{[^}]+\}/g, '');
      
      // Directory column starts at position 99
      const directoryColumn = stripped.substring(99);
      expect(directoryColumn.length).toBe(40);
      
      // Should be truncated from the beginning
      expect(directoryColumn).toContain('...');
      expect(directoryColumn).toContain('src'); // Should keep the end
    });

    it('should format file size correctly', () => {
      // Test different sizes
      const testCases = [
        { size: 0, expected: '0B' },
        { size: 512, expected: '512B' },
        { size: 1024, expected: '1.0K' },
        { size: 1024 * 1024, expected: '1.0M' },
        { size: 1024 * 1024 * 1024, expected: '1.0G' }
      ];

      testCases.forEach(({ size, expected }) => {
        const event = { ...mockEvent, size };
        const result = RowRenderer.renderRow(event, 0, 0, -1, 40);
        const stripped = result.replace(/\{[^}]+\}/g, '');
        
        // Size column position: 19 + 1 + 9 + 1 + 35 + 1 + 8 + 1 + 6 + 1 + 8 + 1 = 91
        const sizeColumn = stripped.substring(91, 98).trim();
        expect(sizeColumn).toBe(expected);
      });
    });

    it('should handle missing event properties gracefully', () => {
      const incompleteEvent: EventRow = {
        ...mockEvent,
        fileName: undefined as any,
        directory: undefined as any,
        lines: undefined,
        blocks: undefined,
        size: undefined
      };

      const result = RowRenderer.renderRow(incompleteEvent, 0, 0, -1, 40);
      expect(result).toBeTruthy();
      
      // Should not throw error
      const stripped = result.replace(/\{[^}]+\}/g, '');
      expect(stripped.length).toBe(139);
    });

    it('should apply event type colors', () => {
      const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      
      eventTypes.forEach(eventType => {
        const event = { ...mockEvent, eventType };
        const result = RowRenderer.renderRow(event, 0, 0, -1, 40);
        
        // Should contain color tags for event type
        // The exact color depends on EventTypeFormatter
        expect(result).toMatch(/\{[a-z]+-fg\}(find|create|modify|delete|move|restore)\{\/[a-z]+-fg\}/);
      });
    });
  });

  describe('renderEndOfData', () => {
    it('should center the end of data message', () => {
      const terminalWidth = 180;
      const result = RowRenderer.renderEndOfData(terminalWidth);
      
      // Should contain the message
      expect(result).toContain('─── end of data ───');
      
      // Should have bold and white tags
      expect(result).toContain('{bold}');
      expect(result).toContain('{white-fg}');
      
      // Should be centered (check for leading spaces)
      const stripped = result.replace(/\{[^}]+\}/g, '');
      const leadingSpaces = stripped.match(/^ */)?.[0].length || 0;
      expect(leadingSpaces).toBeGreaterThan(70); // Should have significant padding
    });

    it('should handle narrow terminals', () => {
      const terminalWidth = 30;
      const result = RowRenderer.renderEndOfData(terminalWidth);
      
      // Should still contain the message
      expect(result).toContain('─── end of data ───');
      
      // Should have minimal or no padding
      const stripped = result.replace(/\{[^}]+\}/g, '');
      const leadingSpaces = stripped.match(/^ */)?.[0].length || 0;
      expect(leadingSpaces).toBeLessThan(10);
    });
  });
});
/**
 * EventTypeFormatter Tests
 * 
 * Tests for event type formatting and coloring
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect } from 'vitest';
import { EventTypeFormatter } from '../../../../../../src/ui/components/EventTable/formatters/EventTypeFormatter';

describe('EventTypeFormatter', () => {
  describe('colorize', () => {
    it('should colorize standard event types with correct colors', () => {
      const testCases = [
        { type: 'find', expectedColor: 'cyan-fg', expectedText: 'find  ' },
        { type: 'create', expectedColor: 'green-fg', expectedText: 'create' },
        { type: 'modify', expectedColor: 'yellow-fg', expectedText: 'modify' },
        { type: 'delete', expectedColor: 'red-fg', expectedText: 'delete' },
        { type: 'move', expectedColor: 'magenta-fg', expectedText: 'move  ' },
        { type: 'restore', expectedColor: 'blue-fg', expectedText: 'back  ' }
      ];

      testCases.forEach(({ type, expectedColor, expectedText }) => {
        const result = EventTypeFormatter.colorize(type);
        
        // Check color tags
        expect(result).toContain(`{${expectedColor}}`);
        expect(result).toContain(`{/${expectedColor}}`);
        
        // Check padded text (exactly 6 characters)
        expect(result).toContain(expectedText);
        
        // Check overall format
        expect(result).toBe(`{${expectedColor}}${expectedText}{/${expectedColor}}`);
      });
    });

    it('should handle case-insensitive event types', () => {
      const testCases = ['FIND', 'Create', 'MoDiFy', 'DELETE', 'Move', 'RESTORE'];
      
      testCases.forEach(type => {
        const result = EventTypeFormatter.colorize(type);
        
        // Should still apply correct coloring
        expect(result).toMatch(/\{[a-z]+-fg\}[a-z\s]+\{\/[a-z]+-fg\}/);
      });
    });

    it('should pad unknown event types to 6 characters with white color', () => {
      const unknownType = 'unknown';
      const result = EventTypeFormatter.colorize(unknownType);
      
      // Should contain white color tags (default for unknown types)
      expect(result).toContain('{white-fg}');
      expect(result).toContain('{/white-fg}');
      
      // Should be padded to 6 characters (truncated)
      expect(result).toBe('{white-fg}unknow{/white-fg}');
    });

    it('should handle empty event type', () => {
      const result = EventTypeFormatter.colorize('');
      
      // Should be 6 spaces with white color
      expect(result).toBe('{white-fg}      {/white-fg}');
    });

    it('should truncate long unknown event types', () => {
      const longType = 'verylongeventtype';
      const result = EventTypeFormatter.colorize(longType);
      
      // Should be truncated to 6 characters with white color
      expect(result).toBe('{white-fg}verylo{/white-fg}');
    });
  });

  describe('format', () => {
    it('should format standard event types without color', () => {
      const testCases = [
        { type: 'find', expected: 'find  ' },
        { type: 'create', expected: 'create' },
        { type: 'modify', expected: 'modify' },
        { type: 'delete', expected: 'delete' },
        { type: 'move', expected: 'move  ' },
        { type: 'restore', expected: 'back  ' }
      ];

      testCases.forEach(({ type, expected }) => {
        const result = EventTypeFormatter.format(type);
        expect(result).toBe(expected);
        expect(result.length).toBe(6);
      });
    });

    it('should handle case-insensitive formatting', () => {
      expect(EventTypeFormatter.format('FIND')).toBe('find  ');
      expect(EventTypeFormatter.format('Create')).toBe('create');
      expect(EventTypeFormatter.format('MoDiFy')).toBe('modify');
    });

    it('should pad unknown event types', () => {
      const result = EventTypeFormatter.format('custom');
      expect(result).toBe('custom');
      expect(result.length).toBe(6);
    });

    it('should handle empty string', () => {
      const result = EventTypeFormatter.format('');
      expect(result).toBe('      ');
      expect(result.length).toBe(6);
    });
  });
});
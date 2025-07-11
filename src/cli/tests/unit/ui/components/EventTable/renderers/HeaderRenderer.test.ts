/**
 * HeaderRenderer Tests
 * 
 * Tests for header rendering logic
 */

import { describe, it, expect } from 'vitest';
import { HeaderRenderer } from '../../../../../../src/ui/components/EventTable/renderers/HeaderRenderer';

describe('HeaderRenderer', () => {
  describe('renderHeader', () => {
    it('should render header with column names and separator', () => {
      const screenWidth = 180;
      const result = HeaderRenderer.renderHeader(screenWidth);
      
      // Should contain two lines
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      
      // First line should be column headers
      expect(lines[0]).toBe('Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory');
      
      // Second line should be separator
      expect(lines[1]).toBe('─'.repeat(180));
    });

    it('should handle different screen widths', () => {
      const screenWidth = 120;
      const result = HeaderRenderer.renderHeader(screenWidth);
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      
      // Separator should match screen width
      expect(lines[1]).toBe('─'.repeat(120));
    });

    it('should use default width when not specified', () => {
      const result = HeaderRenderer.renderHeader(0);
      
      const lines = result.split('\n');
      // Should fall back to 180
      expect(lines[1]).toBe('─'.repeat(180));
    });
  });

  describe('renderColumnLine', () => {
    it('should render just the column header line', () => {
      const result = HeaderRenderer.renderColumnLine();
      
      // Should be the exact header format
      expect(result).toBe('Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory');
      
      // Should not contain newlines
      expect(result).not.toContain('\n');
    });
  });

  describe('renderSeparator', () => {
    it('should render separator line with specified width', () => {
      const width = 100;
      const result = HeaderRenderer.renderSeparator(width);
      
      expect(result).toBe('─'.repeat(100));
      expect(result.length).toBe(100);
    });

    it('should handle edge cases', () => {
      // Zero width
      expect(HeaderRenderer.renderSeparator(0)).toBe('─'.repeat(180)); // Default fallback
      
      // Very large width
      const largeWidth = 300;
      expect(HeaderRenderer.renderSeparator(largeWidth)).toBe('─'.repeat(300));
    });
  });
});
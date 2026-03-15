/**
 * Tests for Style Formatter Utilities
 * Based on: documents/spec/view/style-formatter.md
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import {
  fg,
  bg,
  bold,
  underline,
  style,
  stripStyles,
  eventTypeColor,
} from '../../../src/ui/utils/styleFormatter';

describe('Style Formatter Utilities', () => {
  describe('fg', () => {
    it('should wrap text with blessed foreground color tags', () => {
      expect(fg('hello', 'red')).toBe('{red-fg}hello{/red-fg}');
    });

    it('should handle all color types', () => {
      expect(fg('x', 'green')).toBe('{green-fg}x{/green-fg}');
      expect(fg('x', 'yellow')).toBe('{yellow-fg}x{/yellow-fg}');
      expect(fg('x', 'blue')).toBe('{blue-fg}x{/blue-fg}');
      expect(fg('x', 'magenta')).toBe('{magenta-fg}x{/magenta-fg}');
      expect(fg('x', 'cyan')).toBe('{cyan-fg}x{/cyan-fg}');
      expect(fg('x', 'white')).toBe('{white-fg}x{/white-fg}');
      expect(fg('x', 'black')).toBe('{black-fg}x{/black-fg}');
    });
  });

  describe('bg', () => {
    it('should wrap text with blessed background color tags', () => {
      expect(bg('hello', 'blue')).toBe('{blue-bg}hello{/blue-bg}');
    });

    it('should handle all color types', () => {
      expect(bg('x', 'red')).toBe('{red-bg}x{/red-bg}');
      expect(bg('x', 'green')).toBe('{green-bg}x{/green-bg}');
    });
  });

  describe('bold', () => {
    it('should wrap text with bold tags', () => {
      expect(bold('hello')).toBe('{bold}hello{/bold}');
    });
  });

  describe('underline', () => {
    it('should wrap text with underline tags', () => {
      expect(underline('hello')).toBe('{underline}hello{/underline}');
    });
  });

  describe('style', () => {
    it('should apply fg color only', () => {
      const result = style('text', { fg: 'red' });
      expect(result).toBe('{red-fg}text{/red-fg}');
    });

    it('should apply bg color only', () => {
      const result = style('text', { bg: 'blue' });
      expect(result).toBe('{blue-bg}text{/blue-bg}');
    });

    it('should apply bold only', () => {
      const result = style('text', { bold: true });
      expect(result).toBe('{bold}text{/bold}');
    });

    it('should apply underline only', () => {
      const result = style('text', { underline: true });
      expect(result).toBe('{underline}text{/underline}');
    });

    it('should nest styles in order: bg -> fg -> bold -> underline (innermost to outermost)', () => {
      const result = style('text', { fg: 'red', bg: 'blue', bold: true, underline: true });
      // bg applied first (innermost), then fg, then bold, then underline (outermost)
      expect(result).toBe('{underline}{bold}{red-fg}{blue-bg}text{/blue-bg}{/red-fg}{/bold}{/underline}');
    });

    it('should apply bg then fg when both specified', () => {
      const result = style('text', { fg: 'green', bg: 'black' });
      expect(result).toBe('{green-fg}{black-bg}text{/black-bg}{/green-fg}');
    });

    it('should return plain text when no options specified', () => {
      const result = style('text', {});
      expect(result).toBe('text');
    });
  });

  describe('stripStyles', () => {
    it('should remove all blessed tags using regex', () => {
      const styled = '{red-fg}hello{/red-fg}';
      expect(stripStyles(styled)).toBe('hello');
    });

    it('should remove nested tags', () => {
      const styled = '{bold}{red-fg}hello{/red-fg}{/bold}';
      expect(stripStyles(styled)).toBe('hello');
    });

    it('should return plain text unchanged', () => {
      expect(stripStyles('hello')).toBe('hello');
    });

    it('should remove multiple different tag types', () => {
      const styled = '{underline}{bold}{red-fg}{blue-bg}text{/blue-bg}{/red-fg}{/bold}{/underline}';
      expect(stripStyles(styled)).toBe('text');
    });
  });

  describe('eventTypeColor', () => {
    it('should map find to cyan', () => {
      const result = eventTypeColor('find');
      expect(result).toBe('{cyan-fg}find{/cyan-fg}');
    });

    it('should map create to green', () => {
      const result = eventTypeColor('create');
      expect(result).toBe('{green-fg}create{/green-fg}');
    });

    it('should map modify to yellow', () => {
      const result = eventTypeColor('modify');
      expect(result).toBe('{yellow-fg}modify{/yellow-fg}');
    });

    it('should map delete to red', () => {
      const result = eventTypeColor('delete');
      expect(result).toBe('{red-fg}delete{/red-fg}');
    });

    it('should map move to magenta', () => {
      const result = eventTypeColor('move');
      expect(result).toBe('{magenta-fg}move{/magenta-fg}');
    });

    it('should map restore to blue', () => {
      const result = eventTypeColor('restore');
      expect(result).toBe('{blue-fg}restore{/blue-fg}');
    });

    it('should map back to blue', () => {
      const result = eventTypeColor('back');
      expect(result).toBe('{blue-fg}back{/blue-fg}');
    });

    it('should map unknown event types to white', () => {
      const result = eventTypeColor('unknown');
      expect(result).toBe('{white-fg}unknown{/white-fg}');
    });

    it('should be case-insensitive', () => {
      const result = eventTypeColor('FIND');
      expect(result).toBe('{cyan-fg}FIND{/cyan-fg}');
    });

    it('should trim whitespace before matching', () => {
      const result = eventTypeColor('  modify  ');
      expect(result).toBe('{yellow-fg}  modify  {/yellow-fg}');
    });
  });

  describe('side effects', () => {
    it('should be pure string transformation (no state mutation)', () => {
      const result1 = fg('test', 'red');
      const result2 = fg('test', 'red');
      expect(result1).toBe(result2);
    });
  });
});

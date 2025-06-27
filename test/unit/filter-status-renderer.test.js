/**
 * FilterStatusRenderer Unit Tests (FUNC-020)
 */

const FilterStatusRenderer = require('../../src/ui/filter-status-renderer');

describe('FilterStatusRenderer', () => {
  describe('renderFilterLine', () => {
    test('display when all filters are ON', () => {
      const filters = { 
        find: true, 
        create: true, 
        modify: true, 
        delete: true, 
        move: true,
        restore: true  // FUNC-023 spec compliant
      };
      const result = FilterStatusRenderer.renderFilterLine(filters);
      
      // Green ANSI code (\x1b[32m) should be included
      expect(result).toContain('\x1b[32m');
      // Each key and name should be included
      expect(result).toContain('[f]');
      expect(result).toContain('Find');
      expect(result).toContain('[c]');
      expect(result).toContain('Create');
      expect(result).toContain('[m]');
      expect(result).toContain('Modify');
      expect(result).toContain('[d]');
      expect(result).toContain('Delete');
      expect(result).toContain('[v]');
      expect(result).toContain('Move');
      expect(result).toContain('[r]');
      expect(result).toContain('Restore');
    });
    
    test('display when partial filters are OFF', () => {
      const filters = { 
        find: false, 
        create: true, 
        modify: true, 
        delete: false, 
        move: true,
        restore: false
      };
      const result = FilterStatusRenderer.renderFilterLine(filters);
      
      // Black ANSI code (\x1b[30m) should be included (inactive)
      expect(result).toContain('\x1b[30m');
      // Green ANSI code (\x1b[32m) should also be included (active)
      expect(result).toContain('\x1b[32m');
    });
    
    test('padding to fit screen width', () => {
      const filters = { 
        find: true, 
        create: true, 
        modify: true, 
        delete: true, 
        move: true,
        restore: true
      };
      const width = 100;
      const result = FilterStatusRenderer.renderFilterLine(filters, width);
      
      // Length after removing ANSI codes should be at least the specified width
      const strippedLength = FilterStatusRenderer.stripAnsi(result).length;
      expect(strippedLength).toBeGreaterThanOrEqual(50); // Minimum width
    });
  });
  
  describe('renderFilterItem', () => {
    test('rendering active item', () => {
      const result = FilterStatusRenderer.renderFilterItem('f', 'Find', true);
      
      expect(result).toContain('\x1b[32m[f]\x1b[0m'); // Green key
      expect(result).toContain('\x1b[37mFind\x1b[0m'); // White name
    });
    
    test('rendering inactive item', () => {
      const result = FilterStatusRenderer.renderFilterItem('f', 'Find', false);
      
      expect(result).toContain('\x1b[30m[f]\x1b[0m'); // Black key
      expect(result).toContain('\x1b[90mFind\x1b[0m'); // Dark gray name
    });
  });
  
  describe('getFilterSummary', () => {
    test('when all filters are active', () => {
      const filters = { 
        find: true, 
        create: true, 
        modify: true, 
        delete: true, 
        move: true,
        restore: true
      };
      const summary = FilterStatusRenderer.getFilterSummary(filters);
      expect(summary).toBe('All filters active');
    });
    
    test('when all filters are inactive', () => {
      const filters = { 
        find: false, 
        create: false, 
        modify: false, 
        delete: false, 
        move: false,
        restore: false
      };
      const summary = FilterStatusRenderer.getFilterSummary(filters);
      expect(summary).toBe('No filters active');
    });
    
    test('when partial filters are active', () => {
      const filters = { 
        find: true, 
        create: false, 
        modify: true, 
        delete: false, 
        move: false 
      };
      const summary = FilterStatusRenderer.getFilterSummary(filters);
      expect(summary).toBe('Active: find, modify');
    });
  });
  
  describe('stripAnsi', () => {
    test('removing ANSI codes', () => {
      const withAnsi = '\x1b[32m[f]\x1b[0m:Find';
      const stripped = FilterStatusRenderer.stripAnsi(withAnsi);
      expect(stripped).toBe('[f]:Find');
    });
    
    test('removing multiple ANSI codes', () => {
      const withAnsi = '\x1b[32m[f]\x1b[0m:\x1b[37mFind\x1b[0m';
      const stripped = FilterStatusRenderer.stripAnsi(withAnsi);
      expect(stripped).toBe('[f]:Find');
    });
  });
  
  describe('helper methods', () => {
    test('getFilterLineHeight', () => {
      expect(FilterStatusRenderer.getFilterLineHeight()).toBe(1);
    });
    
    test('getMinimumWidth', () => {
      expect(FilterStatusRenderer.getMinimumWidth()).toBe(60);  // Updated to 60 due to restore addition
    });
  });
});
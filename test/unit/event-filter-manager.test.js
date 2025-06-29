/**
 * EventFilterManager Unit Tests (FUNC-020)
 */

const EventFilterManager = require('../../dist/src/filter/event-filter-manager');

describe('EventFilterManager', () => {
  let filterManager;
  
  beforeEach(() => {
    filterManager = new EventFilterManager();
  });
  
  describe('initial state', () => {
    test('all filters are ON by default', () => {
      expect(filterManager.isVisible('find')).toBe(true);
      expect(filterManager.isVisible('create')).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(true);
      expect(filterManager.isVisible('move')).toBe(true);
      expect(filterManager.isVisible('restore')).toBe(true);
    });
  });
  
  describe('toggleFilter', () => {
    test('filter state toggle', () => {
      expect(filterManager.isVisible('create')).toBe(true);
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('create')).toBe(false);
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('create')).toBe(true);
    });
    
    test('does not affect other filters', () => {
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('modify')).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(true);
      expect(filterManager.isVisible('find')).toBe(true);
    });
    
    test('ignores unknown event types', () => {
      filterManager.toggleFilter('unknown');
      // Should not throw error
      expect(filterManager.getFilterStates()).toEqual({
        find: true,
        create: true,
        modify: true,
        delete: true,
        move: true,
        restore: true
      });
    });
  });
  
  describe('toggleByKey', () => {
    test('toggle find filter with f key', () => {
      const result = filterManager.toggleByKey('f');
      expect(result).toBe(true);
      expect(filterManager.isVisible('find')).toBe(false);
    });
    
    test('toggle create filter with c key', () => {
      const result = filterManager.toggleByKey('c');
      expect(result).toBe(true);
      expect(filterManager.isVisible('create')).toBe(false);
    });
    
    test('toggle modify filter with m key', () => {
      const result = filterManager.toggleByKey('m');
      expect(result).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(false);
    });
    
    test('toggle delete filter with d key', () => {
      const result = filterManager.toggleByKey('d');
      expect(result).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(false);
    });
    
    test('toggle move filter with v key', () => {
      const result = filterManager.toggleByKey('v');
      expect(result).toBe(true);
      expect(filterManager.isVisible('move')).toBe(false);
    });
    
    test('toggle restore filter with r key (FUNC-023 spec compliant)', () => {
      const result = filterManager.toggleByKey('r');
      expect(result).toBe(true);
      expect(filterManager.isVisible('restore')).toBe(false);
    });
    
    test('accepts uppercase keys as well', () => {
      const result = filterManager.toggleByKey('F');
      expect(result).toBe(true);
      expect(filterManager.isVisible('find')).toBe(false);
    });
    
    test('returns false for invalid keys', () => {
      const result = filterManager.toggleByKey('x');
      expect(result).toBe(false);
    });
  });
  
  describe('isVisible', () => {
    test('returns false for unknown event_type', () => {
      const result = filterManager.isVisible('unknown_type');
      expect(result).toBe(false);
    });
  });
  
  describe('filterEvents', () => {
    test('returns only events with filter ON', () => {
      const events = [
        { event_type: 'create', file_name: 'a.js' },
        { event_type: 'modify', file_name: 'b.js' },
        { event_type: 'delete', file_name: 'c.js' }
      ];
      
      filterManager.toggleFilter('modify'); // Turn modify OFF
      
      const filtered = filterManager.filterEvents(events);
      expect(filtered).toHaveLength(2);
      expect(filtered.find(e => e.event_type === 'modify')).toBeUndefined();
    });
    
    test('empty array when all filters are OFF', () => {
      const events = [
        { event_type: 'create', file_name: 'a.js' },
        { event_type: 'modify', file_name: 'b.js' }
      ];
      
      filterManager.toggleFilter('create');
      filterManager.toggleFilter('modify');
      
      const filtered = filterManager.filterEvents(events);
      expect(filtered).toHaveLength(0);
    });
  });
  
  describe('event listeners', () => {
    test('filterChanged event firing', () => {
      const listener = vi.fn();
      filterManager.on('filterChanged', listener);
      
      filterManager.toggleFilter('create');
      
      expect(listener).toHaveBeenCalledWith({
        eventType: 'create',
        isVisible: false,
        allFilters: expect.objectContaining({
          create: false,
          modify: true
        })
      });
    });
  });
  
  describe('resetFilters', () => {
    test('reset all filters to ON', () => {
      // Turn some filters OFF
      filterManager.toggleFilter('create');
      filterManager.toggleFilter('modify');
      filterManager.toggleFilter('delete');
      
      // Reset
      filterManager.resetFilters();
      
      // All should be ON
      expect(filterManager.isVisible('create')).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(true);
    });
    
    test('reset also fires event', () => {
      const listener = vi.fn();
      filterManager.on('filterChanged', listener);
      
      filterManager.resetFilters();
      
      expect(listener).toHaveBeenCalledWith({
        eventType: 'all',
        isVisible: true,
        allFilters: expect.any(Object)
      });
    });
  });
  
  describe('loadFromConfig', () => {
    test('restore filter state from config', () => {
      const config = {
        monitoring: {
          eventFilters: {
            find: false,
            create: true,
            modify: false,
            delete: true,
            move: true
          }
        }
      };
      
      filterManager.loadFromConfig(config);
      
      expect(filterManager.isVisible('find')).toBe(false);
      expect(filterManager.isVisible('create')).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(false);
      expect(filterManager.isVisible('delete')).toBe(true);
      expect(filterManager.isVisible('move')).toBe(true);
    });
    
    test('maintain default when no config', () => {
      filterManager.loadFromConfig(null);
      
      expect(filterManager.isVisible('create')).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(true);
    });
  });
});
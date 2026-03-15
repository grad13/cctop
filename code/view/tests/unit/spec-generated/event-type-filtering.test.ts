/**
 * Tests for Event Type Filtering
 * Based on: documents/spec/view/event-type-filtering.md
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventTypeFilterFlags } from '../../../src/ui/EventTypeFilterFlags';

describe('Event Type Filtering', () => {
  let flags: EventTypeFilterFlags;

  beforeEach(() => {
    flags = new EventTypeFilterFlags();
  });

  describe('default state', () => {
    it('should have all filters ON by default (all events visible)', () => {
      expect(flags.isShowFind).toBe(true);
      expect(flags.isShowCreate).toBe(true);
      expect(flags.isShowModify).toBe(true);
      expect(flags.isShowDelete).toBe(true);
      expect(flags.isShowMove).toBe(true);
      expect(flags.isShowRestore).toBe(true);
    });

    it('should return all 6 event types from getActiveFilters when all enabled', () => {
      const active = flags.getActiveFilters();
      expect(active).toHaveLength(6);
    });

    it('should count 6 active filters by default', () => {
      expect(flags.countActiveFilters()).toBe(6);
    });
  });

  describe('toggle behavior', () => {
    it('should switch find visibility off when toggled once', () => {
      flags.toggleEventType('find');
      expect(flags.isShowFind).toBe(false);
    });

    it('should switch find visibility back on when toggled twice', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('find');
      expect(flags.isShowFind).toBe(true);
    });

    it('should toggle create independently of other filters', () => {
      flags.toggleEventType('create');
      expect(flags.isShowCreate).toBe(false);
      expect(flags.isShowFind).toBe(true);
      expect(flags.isShowModify).toBe(true);
      expect(flags.isShowDelete).toBe(true);
      expect(flags.isShowMove).toBe(true);
      expect(flags.isShowRestore).toBe(true);
    });

    it('should toggle modify via flipModifyFlag', () => {
      flags.flipModifyFlag();
      expect(flags.isShowModify).toBe(false);
    });

    it('should toggle delete via flipDeleteFlag', () => {
      flags.flipDeleteFlag();
      expect(flags.isShowDelete).toBe(false);
    });

    it('should toggle move via flipMoveFlag', () => {
      flags.flipMoveFlag();
      expect(flags.isShowMove).toBe(false);
    });

    it('should toggle restore via flipRestoreFlag', () => {
      flags.flipRestoreFlag();
      expect(flags.isShowRestore).toBe(false);
    });
  });

  describe('independent operation', () => {
    it('should allow multiple filters to be toggled independently', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('delete');
      expect(flags.isShowFind).toBe(false);
      expect(flags.isShowCreate).toBe(true);
      expect(flags.isShowModify).toBe(true);
      expect(flags.isShowDelete).toBe(false);
      expect(flags.isShowMove).toBe(true);
      expect(flags.isShowRestore).toBe(true);
    });

    it('should reflect toggled state in getActiveFilters', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('delete');
      const active = flags.getActiveFilters();
      expect(active).not.toContain('Find');
      expect(active).not.toContain('Delete');
      expect(active).toContain('Create');
      expect(active).toContain('Modify');
      expect(active).toContain('Move');
      expect(active).toContain('Restore');
    });

    it('should count active filters correctly after toggling', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('delete');
      expect(flags.countActiveFilters()).toBe(4);
    });
  });

  describe('isEventTypeEnabled', () => {
    it('should return true for enabled event types', () => {
      expect(flags.isEventTypeEnabled('find')).toBe(true);
      expect(flags.isEventTypeEnabled('create')).toBe(true);
      expect(flags.isEventTypeEnabled('modify')).toBe(true);
      expect(flags.isEventTypeEnabled('delete')).toBe(true);
      expect(flags.isEventTypeEnabled('move')).toBe(true);
      expect(flags.isEventTypeEnabled('restore')).toBe(true);
    });

    it('should return false for disabled event types', () => {
      flags.toggleEventType('find');
      expect(flags.isEventTypeEnabled('find')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(flags.isEventTypeEnabled('Find')).toBe(true);
      expect(flags.isEventTypeEnabled('MODIFY')).toBe(true);
    });

    it('should return false for unknown event types', () => {
      expect(flags.isEventTypeEnabled('unknown')).toBe(false);
    });
  });

  describe('toggleEventType case-insensitivity', () => {
    it('should toggle event type regardless of case', () => {
      flags.toggleEventType('Find');
      expect(flags.isShowFind).toBe(false);
    });
  });

  describe('resetAll', () => {
    it('should restore all filters to ON after reset', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('create');
      flags.toggleEventType('modify');
      flags.resetAll();
      expect(flags.isShowFind).toBe(true);
      expect(flags.isShowCreate).toBe(true);
      expect(flags.isShowModify).toBe(true);
      expect(flags.isShowDelete).toBe(true);
      expect(flags.isShowMove).toBe(true);
      expect(flags.isShowRestore).toBe(true);
    });
  });

  describe('clone', () => {
    it('should create an independent copy with the same state', () => {
      flags.toggleEventType('find');
      const cloned = flags.clone();
      expect(cloned.isShowFind).toBe(false);
      expect(cloned.isShowCreate).toBe(true);
    });

    it('should not affect original when clone is modified', () => {
      const cloned = flags.clone();
      cloned.toggleEventType('create');
      expect(flags.isShowCreate).toBe(true);
      expect(cloned.isShowCreate).toBe(false);
    });
  });

  describe('getActiveFilters for database query', () => {
    it('should return capitalized event type names', () => {
      const active = flags.getActiveFilters();
      expect(active).toContain('Find');
      expect(active).toContain('Create');
      expect(active).toContain('Modify');
      expect(active).toContain('Delete');
      expect(active).toContain('Move');
      expect(active).toContain('Restore');
    });

    it('should exclude disabled event types from active filters', () => {
      flags.toggleEventType('move');
      const active = flags.getActiveFilters();
      expect(active).not.toContain('Move');
      expect(active).toHaveLength(5);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordSearchManager } from '../../../src/search/KeywordSearchManager';
import { TextNormalizer } from '../../../src/search/TextNormalizer';
import { EventRow } from '../../../src/types/event-row';

describe('FUNC-209 Performance Tests', () => {
  let largeEventSet: EventRow[];

  beforeEach(() => {
    // Generate 10,000 events for performance testing
    largeEventSet = [];
    for (let i = 0; i < 10000; i++) {
      largeEventSet.push({
        id: i,
        timestamp: Date.now() / 1000,
        filename: `file-${i % 100}.${['js', 'ts', 'md', 'json', 'txt'][i % 5]}`,
        directory: `/path/to/${['src', 'test', 'docs', 'lib', 'config'][i % 5]}/subdir-${i % 20}`,
        event_type: (['create', 'modify', 'delete', 'find', 'move', 'restore'][i % 6]) as any,
        size: Math.floor(Math.random() * 10000),
        lines: Math.floor(Math.random() * 1000),
        blocks: Math.floor(Math.random() * 10),
        inode: 10000 + i,
        elapsed_ms: Math.floor(Math.random() * 5000)
      });
    }
  });

  describe('Local Search Performance', () => {
    it('should search 10,000 events within 100ms with single keyword', () => {
      const start = performance.now();
      const results = KeywordSearchManager.performLocalSearch(largeEventSet, 'test');
      const duration = performance.now() - start;
      
      console.log(`Single keyword search duration: ${duration.toFixed(2)}ms`);
      console.log(`Results found: ${results.length}`);
      
      expect(duration).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search 10,000 events within 100ms with multiple keywords', () => {
      const start = performance.now();
      const results = KeywordSearchManager.performLocalSearch(largeEventSet, 'test file-1');
      const duration = performance.now() - start;
      
      console.log(`Multiple keyword search duration: ${duration.toFixed(2)}ms`);
      console.log(`Results found: ${results.length}`);
      
      expect(duration).toBeLessThan(100);
    });

    it('should handle long keyword search efficiently', () => {
      const longKeyword = 'a'.repeat(100);
      const start = performance.now();
      const results = KeywordSearchManager.performLocalSearch(largeEventSet, longKeyword);
      const duration = performance.now() - start;
      
      console.log(`Long keyword search duration: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(100);
    });

    it('should handle many keywords search efficiently', () => {
      const manyKeywords = 'test file src docs lib config json ts js md'.split(' ').join(' ');
      const start = performance.now();
      const results = KeywordSearchManager.performLocalSearch(largeEventSet, manyKeywords);
      const duration = performance.now() - start;
      
      console.log(`10 keywords search duration: ${duration.toFixed(2)}ms`);
      console.log(`Results found: ${results.length}`);
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Normalization Performance', () => {
    it('should normalize text with control characters quickly', () => {
      const textWithControlChars = 'test\n\t\rfile\x00name\x1F';
      const iterations = 10000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        TextNormalizer.normalizeSearchText(textWithControlChars);
      }
      const duration = performance.now() - start;
      const avgTime = duration / iterations;
      
      console.log(`Normalization average time: ${avgTime.toFixed(4)}ms per operation`);
      console.log(`Total time for ${iterations} iterations: ${duration.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per normalization
    });
  });

  describe('Memory Usage', () => {
    it('should not create excessive memory allocations during search', () => {
      const memBefore = process.memoryUsage().heapUsed;
      
      // Perform multiple searches
      for (let i = 0; i < 100; i++) {
        KeywordSearchManager.performLocalSearch(largeEventSet, `test-${i}`);
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB
      
      console.log(`Memory increase after 100 searches: ${memIncrease.toFixed(2)}MB`);
      
      // Should not increase memory by more than 50MB for 100 searches
      expect(memIncrease).toBeLessThan(50);
    });
  });
});
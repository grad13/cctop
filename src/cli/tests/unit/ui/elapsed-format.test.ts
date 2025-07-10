/**
 * Elapsed Time Format Test
 * Tests the formatElapsed method for leading zero removal
 */

import { describe, it, expect } from 'vitest';
import { UIDataFormatter } from '../../../src/ui/UIDataFormatter';
import { UIState } from '../../../src/ui/UIState';

describe('UIDataFormatter - Elapsed Time Format', () => {
  const uiState = new UIState('all');
  const formatter = new UIDataFormatter(uiState);

  describe('formatElapsed - Leading Zero Removal', () => {
    it('should remove leading zero for hours under 10', () => {
      const now = Date.now();
      
      // 6時間18分47秒前 (Unix timestamp)
      const timestamp = Math.floor((now - (6 * 3600 + 18 * 60 + 47) * 1000) / 1000);
      const result = formatter.formatElapsed(timestamp);
      
      // 先頭の0が除去されて "6:18:47" になることを確認
      expect(result).toMatch(/^6:\d{2}:\d{2}$/);
      expect(result).not.toMatch(/^0/);
    });

    it('should keep leading zero for hours 10 and above', () => {
      const now = Date.now();
      
      // 12時間34分56秒前 (Unix timestamp)
      const timestamp = Math.floor((now - (12 * 3600 + 34 * 60 + 56) * 1000) / 1000);
      const result = formatter.formatElapsed(timestamp);
      
      // 10時間以上は従来通り "12:34:56" になることを確認
      expect(result).toMatch(/^1\d:\d{2}:\d{2}$/);
    });

    it('should format 1-9 hours without leading zero', () => {
      const now = Date.now();
      
      const testCases = [
        { hours: 1, expected: /^1:\d{2}:\d{2}$/ },
        { hours: 5, expected: /^5:\d{2}:\d{2}$/ },
        { hours: 9, expected: /^9:\d{2}:\d{2}$/ }
      ];

      testCases.forEach(({ hours, expected }) => {
        const timestamp = Math.floor((now - hours * 3600 * 1000) / 1000);
        const result = formatter.formatElapsed(timestamp);
        expect(result).toMatch(expected);
        expect(result).not.toMatch(/^0/);
      });
    });

    it('should format 10+ hours with proper padding', () => {
      const now = Date.now();
      
      const testCases = [
        { hours: 10, expected: /^10:\d{2}:\d{2}$/ },
        { hours: 23, expected: /^23:\d{2}:\d{2}$/ },
        { hours: 48, expected: /^48:\d{2}:\d{2}$/ }
      ];

      testCases.forEach(({ hours, expected }) => {
        const timestamp = Math.floor((now - hours * 3600 * 1000) / 1000);
        const result = formatter.formatElapsed(timestamp);
        expect(result).toMatch(expected);
      });
    });

    it('should maintain mm:ss format for under 1 hour', () => {
      const now = Date.now();
      
      // 30分前
      const timestamp = Math.floor((now - 30 * 60 * 1000) / 1000);
      const result = formatter.formatElapsed(timestamp);
      
      // 分:秒形式 "30:00" であることを確認
      expect(result).toMatch(/^\d{2}:\d{2}$/);
      expect(result.split(':').length).toBe(2); // コロンが1つあるので2つの部分に分かれる
    });
  });
});
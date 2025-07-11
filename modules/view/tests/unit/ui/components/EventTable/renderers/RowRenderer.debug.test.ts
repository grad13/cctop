/**
 * Debug test for RowRenderer
 */

import { describe, it, expect } from 'vitest';
import { RowRenderer } from '../../../../../../src/ui/components/EventTable/renderers/RowRenderer';
import { EventRow } from '../../../../../../src/types/event-row';

describe('RowRenderer Debug', () => {
  it('should debug render output', () => {
    const mockEvent: EventRow = {
      id: 1,
      timestamp: '2025-01-11T10:00:00Z',
      filename: 'test-file-with-long-name-that-should-be-truncated.js',
      directory: '/very/long/path/that/should/be/truncated/from/the/beginning/project/src',
      event_type: 'create',
      size: 1024 * 1024, // 1MB
      lines: 100,
      blocks: 8,
      inode: 12345,
      elapsed_ms: 0
    };

    const result = RowRenderer.renderRow(mockEvent, 0, 0, -1, 40);
    const stripped = result.replace(/\{[^}]+\}/g, '');
    
    console.log('Result:', result);
    console.log('Stripped:', stripped);
    console.log('Length:', stripped.length);
    console.log('Directory part:', stripped.substring(99));
    console.log('Directory part length:', stripped.substring(99).length);
    
    // Let's check each part
    const timestamp = stripped.substring(0, 19);
    const elapsed = stripped.substring(20, 29);
    const filename = stripped.substring(30, 65);
    const eventType = stripped.substring(66, 74);
    const lines = stripped.substring(75, 81);
    const blocks = stripped.substring(82, 90);
    const size = stripped.substring(91, 98);
    const directory = stripped.substring(99);
    
    console.log('Parts:');
    console.log('Timestamp:', `"${timestamp}"`, timestamp.length);
    console.log('Elapsed:', `"${elapsed}"`, elapsed.length);
    console.log('Filename:', `"${filename}"`, filename.length);
    console.log('Event Type:', `"${eventType}"`, eventType.length);
    console.log('Lines:', `"${lines}"`, lines.length);
    console.log('Blocks:', `"${blocks}"`, blocks.length);
    console.log('Size:', `"${size}"`, size.length);
    console.log('Directory:', `"${directory}"`, directory.length);
  });
});
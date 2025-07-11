/**
 * Event type formatting and coloring for EventTable
 */

import { eventTypeColor } from '../../../utils/styleFormatter';

export class EventTypeFormatter {
  /**
   * Colorize event type with blessed tags
   * Each event type is padded to exactly 6 characters
   */
  static colorize(eventType: string): string {
    // Get formatted (padded) event type
    const formatted = this.format(eventType);
    // Apply color using unified style function
    return eventTypeColor(formatted);
  }

  /**
   * Get raw padded event type without color
   */
  static format(eventType: string): string {
    const typeMap: { [key: string]: string } = {
      find: 'find  ',
      create: 'create',
      modify: 'modify',
      delete: 'delete',
      move: 'move  ',
      restore: 'back  ',
      back: 'back  '
    };
    
    const result = typeMap[eventType.toLowerCase()] || eventType;
    // Ensure exactly 6 characters - truncate if longer, pad if shorter
    if (result.length > 6) {
      return result.substring(0, 6);
    }
    return result.padEnd(6);
  }
}
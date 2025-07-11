/**
 * Event type formatting and coloring for EventTable
 */

import { eventTypeColor } from '../../../utils/styleFormatter';

export class EventTypeFormatter {
  /**
   * Colorize event type with blessed tags
   * Each event type is padded to exactly 8 characters
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
      find: 'find    ',
      create: 'create  ',
      modify: 'modify  ',
      delete: 'delete  ',
      move: 'move    ',
      restore: 'restore '
    };
    
    return typeMap[eventType.toLowerCase()] || eventType.padEnd(8);
  }
}
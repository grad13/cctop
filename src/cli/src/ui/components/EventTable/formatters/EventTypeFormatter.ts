/**
 * Event type formatting and coloring for EventTable
 * Extracted from UIDataFormatter
 */

export class EventTypeFormatter {
  /**
   * Colorize event type with blessed tags
   * Each event type is padded to exactly 8 characters
   */
  static colorize(eventType: string): string {
    // Use blessed tags for colors (now that we're using box instead of list)
    const colors: { [key: string]: string } = {
      find: '{cyan-fg}find    {/cyan-fg}',      // "find    " = 8 chars
      create: '{green-fg}create  {/green-fg}',  // "create  " = 8 chars  
      modify: '{yellow-fg}modify  {/yellow-fg}', // "modify  " = 8 chars
      delete: '{red-fg}delete  {/red-fg}',      // "delete  " = 8 chars
      move: '{magenta-fg}move    {/magenta-fg}', // "move    " = 8 chars
      restore: '{blue-fg}restore {/blue-fg}'    // "restore " = 8 chars
    };
    
    return colors[eventType.toLowerCase()] || eventType.padEnd(8);
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
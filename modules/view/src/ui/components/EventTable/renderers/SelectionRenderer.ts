/**
 * Selection state rendering for EventTable
 */

export class SelectionRenderer {
  /**
   * Apply selection highlighting to a row
   */
  static applySelection(content: string, isSelected: boolean): string {
    if (isSelected) {
      return `{blue-bg}${content}{/blue-bg}`;
    }
    return content;
  }

  /**
   * Apply normal (non-selected) styling
   */
  static applyNormalStyle(content: string): string {
    return `{green-fg}${content}{/green-fg}`;
  }

  /**
   * Check if row should be highlighted
   */
  static shouldHighlight(rowIndex: number, selectedIndex: number): boolean {
    return rowIndex === selectedIndex;
  }
}
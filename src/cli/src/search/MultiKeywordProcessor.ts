/**
 * Multi-Keyword Processor for Search Functionality
 * Handles AND search logic for multiple keywords
 */

import { EventRow } from '../types/event-row';

export class MultiKeywordProcessor {
  /**
   * Search events with multiple keywords using AND logic
   * @param events Array of events to search
   * @param keywords Array of search keywords
   * @returns Filtered events that contain ALL keywords
   */
  static searchWithMultipleKeywords(events: EventRow[], keywords: string[]): EventRow[] {
    if (!events || events.length === 0) return [];
    if (!keywords || keywords.length === 0) return events;

    return events.filter(event => 
      keywords.every(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        const filename = (event.filename || '').toLowerCase();
        const directory = (event.directory || '').toLowerCase();
        
        // Check if keyword exists in either filename or directory
        return filename.includes(lowerKeyword) || directory.includes(lowerKeyword);
      })
    );
  }

  /**
   * Check if a single event matches all keywords
   * @param event Event to check
   * @param keywords Array of search keywords
   * @returns True if event matches all keywords
   */
  static eventMatchesAllKeywords(event: EventRow, keywords: string[]): boolean {
    if (!keywords || keywords.length === 0) return true;
    
    return keywords.every(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      const filename = (event.filename || '').toLowerCase();
      const directory = (event.directory || '').toLowerCase();
      
      return filename.includes(lowerKeyword) || directory.includes(lowerKeyword);
    });
  }

  /**
   * Build SQL WHERE clause for multiple keywords
   * @param keywords Array of search keywords
   * @param fileNameColumn Name of the filename column
   * @param filePathColumn Name of the filepath column
   * @returns SQL WHERE clause string
   */
  static buildSqlWhereClause(
    keywords: string[], 
    fileNameColumn: string = 'file_name',
    filePathColumn: string = 'file_path'
  ): string {
    if (!keywords || keywords.length === 0) return '1=1';
    
    const conditions = keywords.map(keyword => {
      const escapedKeyword = keyword.replace(/'/g, "''"); // Escape single quotes
      return `(${fileNameColumn} LIKE '%${escapedKeyword}%' OR ${filePathColumn} LIKE '%${escapedKeyword}%')`;
    });
    
    return conditions.join(' AND ');
  }

  /**
   * Get search statistics for debugging
   * @param events Array of events
   * @param keywords Array of search keywords
   * @returns Search statistics
   */
  static getSearchStatistics(events: EventRow[], keywords: string[]): {
    totalEvents: number;
    matchingEvents: number;
    keywords: string[];
    matchPercentage: number;
  } {
    const matchingEvents = this.searchWithMultipleKeywords(events, keywords);
    const totalEvents = events.length;
    const matchCount = matchingEvents.length;
    
    return {
      totalEvents,
      matchingEvents: matchCount,
      keywords,
      matchPercentage: totalEvents > 0 ? (matchCount / totalEvents) * 100 : 0
    };
  }
}
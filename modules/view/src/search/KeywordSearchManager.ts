/**
 * Keyword Search Manager
 * Integrates text normalization and multi-keyword search functionality
 */

import { EventRow } from '../types/event-row';
import { TextNormalizer } from './TextNormalizer';
import { MultiKeywordProcessor } from './MultiKeywordProcessor';

export class KeywordSearchManager {
  /**
   * Process raw search input and return normalized keywords
   * @param rawInput Raw search input from user
   * @returns Array of normalized keywords
   */
  static processSearchInput(rawInput: string): string[] {
    const normalized = TextNormalizer.normalizeSearchText(rawInput);
    return TextNormalizer.parseKeywords(normalized);
  }

  /**
   * Perform local search on events with normalized input
   * @param events Array of events to search
   * @param rawInput Raw search input from user
   * @returns Filtered events
   */
  static performLocalSearch(events: EventRow[], rawInput: string): EventRow[] {
    const keywords = this.processSearchInput(rawInput);
    return MultiKeywordProcessor.searchWithMultipleKeywords(events, keywords);
  }

  /**
   * Get normalized display text for UI
   * @param rawInput Raw search input
   * @returns Normalized text safe for display
   */
  static getDisplayText(rawInput: string): string {
    return TextNormalizer.normalizeSearchText(rawInput);
  }

  /**
   * Build database search parameters
   * @param rawInput Raw search input
   * @returns Object containing keywords and SQL where clause
   */
  static buildDatabaseSearchParams(rawInput: string): {
    keywords: string[];
    whereClause: string;
    normalizedText: string;
  } {
    const normalizedText = TextNormalizer.normalizeSearchText(rawInput);
    const keywords = TextNormalizer.parseKeywords(normalizedText);
    const whereClause = MultiKeywordProcessor.buildSqlWhereClause(keywords, 'f.file_name', 'f.file_path');
    
    return {
      keywords,
      whereClause,
      normalizedText
    };
  }

  /**
   * Check if search input is valid
   * @param rawInput Raw search input
   * @returns True if input contains valid search keywords
   */
  static isValidSearchInput(rawInput: string): boolean {
    const keywords = this.processSearchInput(rawInput);
    return keywords.length > 0;
  }

  /**
   * Get search debug information
   * @param rawInput Raw search input
   * @returns Debug information object
   */
  static getDebugInfo(rawInput: string): {
    rawInput: string;
    displaySafe: string;
    normalized: string;
    keywords: string[];
    hasControlChars: boolean;
  } {
    const normalized = TextNormalizer.normalizeSearchText(rawInput);
    
    return {
      rawInput,
      displaySafe: TextNormalizer.getDisplaySafeText(rawInput),
      normalized,
      keywords: TextNormalizer.parseKeywords(normalized),
      hasControlChars: TextNormalizer.hasControlCharacters(rawInput)
    };
  }
}
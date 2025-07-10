/**
 * Text Normalizer for Keyword Search
 * Handles input text normalization including control character processing
 */

export class TextNormalizer {
  /**
   * Normalize search text by removing control characters and normalizing spaces
   * @param text Raw input text
   * @returns Normalized text
   */
  static normalizeSearchText(text: string): string {
    if (!text) return '';
    
    // a. Replace control characters with space
    // ASCII control characters (0x00-0x1F, 0x7F)
    let normalized = text.replace(/[\x00-\x1F\x7F]/g, ' ');
    
    // b. Trim leading and trailing whitespace
    normalized = normalized.trim();
    
    // c. Replace multiple consecutive spaces with single space
    // This also handles full-width spaces and other Unicode spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized;
  }

  /**
   * Parse normalized text into keywords array
   * @param normalizedText Normalized search text
   * @returns Array of keywords
   */
  static parseKeywords(normalizedText: string): string[] {
    if (!normalizedText) return [];
    
    return normalizedText
      .split(' ')
      .filter(k => k.length > 0);
  }

  /**
   * Check if text contains control characters
   * @param text Input text
   * @returns True if text contains control characters
   */
  static hasControlCharacters(text: string): boolean {
    return /[\x00-\x1F\x7F]/.test(text);
  }

  /**
   * Get display-safe version of text (for debugging)
   * @param text Input text
   * @returns Display-safe text with visible control characters
   */
  static getDisplaySafeText(text: string): string {
    return text
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F]/g, (char) => {
        const code = char.charCodeAt(0);
        return `\\x${code.toString(16).padStart(2, '0')}`;
      });
  }
}
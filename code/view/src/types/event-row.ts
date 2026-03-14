/**
 * Event Row type definition for CLI
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

export interface EventRow {
  id: number;
  timestamp: string | number; // Support both Unix timestamp (number) and ISO string
  filename: string;
  directory: string;
  event_type: string;
  size: number;
  lines?: number;
  blocks?: number;
  inode: number;
  elapsed_ms: number;
}
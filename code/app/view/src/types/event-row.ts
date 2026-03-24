// meta: updated=2026-03-17 12:02 checked=-

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
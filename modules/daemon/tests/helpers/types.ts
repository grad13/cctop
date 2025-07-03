/**
 * Type definitions for test helpers
 */

export interface DbEvent {
  id: number;
  event_type: string;
  file_path: string;
  directory: string;
  filename: string;
  file_size: number;
  timestamp: string;
  inode_number: number;
}

export interface AggregateData {
  id: number;
  file_id: number;
  total_events: number;
  total_finds: number;
  total_creates: number;
  total_modifies: number;
  total_deletes: number;
  total_moves: number;
  total_restores: number;
  first_size: number;
  max_size: number;
  last_size: number;
  first_event_timestamp: number;
  last_event_timestamp: number;
  file_path: string;
  inode_number: number;
  is_active: boolean;
}

export interface GlobalStatistics {
  total_finds: number;
  total_creates: number;
  total_modifies: number;
  total_deletes: number;
  total_moves: number;
  total_restores: number;
  total_events: number;
  total_files: number;
  active_files: number;
  total_current_size: number;
  avg_file_size: number;
  largest_file_size: number;
  smallest_file_size: number;
  earliest_event: number;
  latest_event: number;
}
-- cctop Database Indexes
-- Version: 0.3.0
-- Based on FUNC-000 specification

-- Basic indexes for Phase 1
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path);
CREATE INDEX IF NOT EXISTS idx_events_file_id ON events(file_id);
CREATE INDEX IF NOT EXISTS idx_events_file_timestamp ON events(file_id, timestamp);  -- For fast traversal

-- Phase 2+ indexes (commented out for future implementation)
-- CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(event_type_id, timestamp);
-- CREATE INDEX IF NOT EXISTS idx_events_directory ON events(directory);
-- CREATE INDEX IF NOT EXISTS idx_aggregates_updated ON aggregates(last_updated);
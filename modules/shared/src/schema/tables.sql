-- cctop Database Schema Definition
-- Version: 0.3.0
-- Based on FUNC-000 specification

-- 1. events table
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix timestamp
    event_type_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,            -- Reference to files table
    file_path TEXT NOT NULL,             -- Full path
    file_name TEXT NOT NULL,             -- File name only
    directory TEXT NOT NULL,             -- Directory path
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (file_id) REFERENCES files(id)
);

-- 2. event_types table
CREATE TABLE IF NOT EXISTS event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,           -- find/create/modify/delete/move/restore
    name TEXT NOT NULL,                  -- Display name
    description TEXT                     -- Description
);

-- 3. files table
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inode INTEGER,                       -- Current latest inode value
    is_active BOOLEAN DEFAULT TRUE       -- Active status flag
);

-- 4. measurements table
CREATE TABLE IF NOT EXISTS measurements (
    event_id INTEGER PRIMARY KEY,
    inode INTEGER,                       -- Inode value at that time (for history)
    file_size INTEGER,                   -- File size in bytes
    line_count INTEGER,                  -- Line count (text files only)
    block_count INTEGER,                 -- Block count
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- 5. aggregates table
CREATE TABLE IF NOT EXISTS aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,                     -- Reference to files table
    period_start INTEGER,                -- Aggregation period start time
    
    -- Cumulative statistics
    total_size INTEGER DEFAULT 0,        -- Cumulative file size
    total_lines INTEGER DEFAULT 0,       -- Cumulative line count
    total_blocks INTEGER DEFAULT 0,      -- Cumulative block count
    
    -- Event counts
    total_events INTEGER DEFAULT 0,      -- Total event count
    total_creates INTEGER DEFAULT 0,     -- Create event count
    total_modifies INTEGER DEFAULT 0,    -- Modify event count
    total_deletes INTEGER DEFAULT 0,     -- Delete event count
    total_moves INTEGER DEFAULT 0,       -- Move event count
    total_restores INTEGER DEFAULT 0,    -- Restore event count
    
    -- Time series statistics
    first_event_timestamp INTEGER,       -- First event timestamp
    last_event_timestamp INTEGER,        -- Latest event timestamp
    
    -- Metric statistics (Size)
    first_size INTEGER,                  -- First file size
    max_size INTEGER,                    -- Maximum file size
    last_size INTEGER,                   -- Latest file size
    
    -- Metric statistics (Lines)
    first_lines INTEGER,                 -- First line count
    max_lines INTEGER,                   -- Maximum line count
    last_lines INTEGER,                  -- Latest line count
    
    -- Metric statistics (Blocks)
    first_blocks INTEGER,                -- First block count
    max_blocks INTEGER,                  -- Maximum block count
    last_blocks INTEGER,                 -- Latest block count
    
    -- Metadata
    last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
    calculation_method TEXT DEFAULT 'trigger',
    
    FOREIGN KEY (file_id) REFERENCES files(id)
);
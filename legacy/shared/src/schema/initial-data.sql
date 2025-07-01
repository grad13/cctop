-- cctop Initial Data
-- Version: 0.3.0
-- Based on FUNC-000 specification

-- Insert event types
INSERT OR IGNORE INTO event_types (code, name, description) VALUES
('find', 'Find', 'Initial file discovery'),
('create', 'Create', 'File creation'),
('modify', 'Modify', 'File modification'),
('delete', 'Delete', 'File deletion'),
('move', 'Move', 'File move/rename'),
('restore', 'Restore', 'File restoration after deletion');
-- Note: 'error' type will be added in v0.2.0.0+
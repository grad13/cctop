import { z } from 'zod';

/**
 * Database Schema Validation
 * 仕様書: documents/visions/specifications/database/db001-schema-design.md
 */

// Event Types Schema
export const EventTypeSchema = z.object({
  id: z.number().positive(),
  code: z.enum(['find', 'create', 'modify', 'delete', 'move', 'restore']),
  name: z.string().min(1),
  description: z.string().optional()
});

// Files Schema (v0.2.0)
export const FilesSchema = z.object({
  id: z.number().positive(),
  inode: z.number().positive().optional(),
  is_active: z.number().min(0).max(1).default(1)
});

// Events Schema (Main Event Table)
export const EventRecordSchema = z.object({
  id: z.number().positive().optional(), // AUTO_INCREMENT
  timestamp: z.number().positive(),
  event_type_id: z.number().positive(),
  file_id: z.number().positive(),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  directory: z.string().min(1),
  is_directory: z.number().min(0).max(1), // SQLite boolean as integer
  previous_event_id: z.number().positive().nullable().optional(),
  source_path: z.string().nullable().optional(),
  file_size: z.number().min(0).optional(),
  line_count: z.number().min(0).optional(),
  block_count: z.number().min(0).optional()
});

// Measurements Schema (v0.2.0)
export const MeasurementsSchema = z.object({
  event_id: z.number().positive(),
  inode: z.number().positive().optional(),
  file_size: z.number().min(0).optional(),
  line_count: z.number().min(0).optional(),
  block_count: z.number().min(0).optional()
});

// Aggregates Schema (v0.2.0)
export const AggregatesSchema = z.object({
  file_id: z.number().positive(),
  current_file_size: z.number().min(0).default(0),
  current_line_count: z.number().min(0).default(0),
  current_block_count: z.number().min(0).default(0),
  total_events: z.number().min(0).default(0),
  total_modifications: z.number().min(0).default(0),
  first_seen: z.number().positive().optional(),
  last_seen: z.number().positive().optional(),
  creation_time: z.number().positive().optional(),
  last_modification_time: z.number().positive().optional()
});

// Database Table Structure Schema
export const TableStructureSchema = z.object({
  name: z.string(),
  type: z.string(),
  notnull: z.number().min(0).max(1),
  dflt_value: z.any().optional(),
  pk: z.number().min(0).max(1)
});

// Expected Table Columns (for schema verification)
export const ExpectedTablesSchema = z.object({
  event_types: z.array(z.string()).refine(
    (cols) => ['id', 'code', 'name', 'description'].every(col => cols.includes(col)),
    { message: "event_types table missing required columns" }
  ),
  files: z.array(z.string()).refine(
    (cols) => ['id', 'inode', 'is_active'].every(col => cols.includes(col)),
    { message: "files table missing required columns" }
  ),
  measurements: z.array(z.string()).refine(
    (cols) => ['event_id', 'inode', 'file_size', 'line_count', 'block_count'].every(col => cols.includes(col)),
    { message: "measurements table missing required columns" }
  ),
  events: z.array(z.string()).refine(
    (cols) => ['id', 'timestamp', 'event_type_id', 'file_id', 'file_path', 'file_name', 'directory'].every(col => cols.includes(col)),
    { message: "events table missing required columns" }
  ),
  aggregates: z.array(z.string()).refine(
    (cols) => ['file_id', 'current_file_size', 'total_events'].every(col => cols.includes(col)),
    { message: "aggregates table missing required columns" }
  )
});
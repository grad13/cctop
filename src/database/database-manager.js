/**
 * Database Manager (FUNC-000 v0.2.0.0 compliant)
 * Complete file lifecycle tracking with 5-table structure
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { schema, initialData } = require('./schema');

class DatabaseManager {
  constructor(dbPath = null) {
    // FUNC-100 compliant: Default is ./.cctop/activity.db (local)
    this.dbPath = dbPath || path.join(process.cwd(), '.cctop', 'activity.db');
    this.db = null;
    this.isInitialized = false;
    this.transactionActive = false; // Transaction state management
    this.verbose = process.env.CCTOP_VERBOSE === 'true';
    
    // Always log the database path for debugging
    console.log(`[DatabaseManager] Initializing with path: ${this.dbPath}`);
  }

  /**
   * Initialize database with complete synchronization
   * Addresses race condition between isInitialized flag and actual DB connection
   */
  async initialize() {
    try {
      // Create ~/.cctop directory if it doesn't exist
      const cctopDir = path.dirname(this.dbPath);
      if (!fs.existsSync(cctopDir)) {
        fs.mkdirSync(cctopDir, { recursive: true });
        if (this.verbose) {
          console.log(`Created ~/.cctop directory: ${cctopDir}`);
        }
      }

      // 1. Database connection
      await this.connect();
      
      // 2. Connection verification (critical: actual connection test)
      await this.waitForConnection(5000);
      
      // 3. Schema initialization
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      await this.insertInitialData();
      
      // 4. Final connection confirmation
      await this.testConnection();
      
      // 5. Set flag only after everything is confirmed complete
      this.isInitialized = true;
      if (this.verbose) {
        console.log(`Database initialized: ${this.dbPath}`);
      }
      
    } catch (error) {
      // Attempt recovery for corrupted database
      if (error.code === 'SQLITE_NOTADB' || error.message.includes('not a database')) {
        if (this.verbose) {
          console.warn('Corrupted database detected, attempting recovery...');
        }
        
        // Close existing connection
        if (this.db) {
          try {
            await this.close();
          } catch (closeError) {
            // Ignore errors (already corrupted)
          }
        }
        
        // Backup corrupted database
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        try {
          fs.renameSync(this.dbPath, backupPath);
          if (this.verbose) {
            console.log(`Backed up corrupted database to: ${path.basename(backupPath)}`);
          }
        } catch (backupError) {
          if (this.verbose) {
            console.error('Failed to backup corrupted database:', backupError);
          }
        }
        
        // Retry with new database
        await this.connect();
        await this.createTables();
        await this.createIndexes();
        await this.createTriggers();
        await this.insertInitialData();
        
        // Final connection confirmation for recovered database
        await this.testConnection();
        
        this.isInitialized = true;
        if (this.verbose) {
          console.log(`Database recovered: ${this.dbPath}`);
        }
      } else {
        this.isInitialized = false;
        if (this.verbose) {
          console.error('Database initialization failed:', error);
        }
        throw error;
      }
    }
  }

  /**
   * Database connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          
          // Enable WAL mode
          this.db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) {
              reject(err);
            } else {
              if (this.verbose) {
                console.log(`Connected to SQLite: ${this.dbPath}`);
              }
              resolve();
            }
          });
        }
      });
    });
  }

  /**
   * Create tables (order important due to foreign key constraints)
   */
  async createTables() {
    // Enable foreign key constraints
    await this.run('PRAGMA foreign_keys = ON');
    
    // 1. event_types (referenced by other tables)
    await this.run(schema.event_types);
    if (this.verbose) {
      console.log(`Table created: event_types`);
    }
    
    // 2. files (referenced by events)
    await this.run(schema.files);
    if (this.verbose) {
      console.log(`Table created: files`);
    }
    
    // 3. events (referenced by measurements, aggregates)
    await this.run(schema.events);
    if (this.verbose) {
      console.log(`Table created: events`);
    }
    
    // 4. measurements (references events)
    await this.run(schema.measurements);
    if (this.verbose) {
      console.log(`Table created: measurements`);
    }
    
    // 5. aggregates (references files)
    await this.run(schema.aggregates);
    if (this.verbose) {
      console.log(`Table created: aggregates`);
    }
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    for (const indexSql of schema.indexes) {
      await this.run(indexSql);
    }
    if (this.verbose) {
      console.log(`Indexes created`);
    }
  }

  /**
   * Create database triggers (HO-003)
   */
  async createTriggers() {
    try {
      if (!schema.triggers) {
        return; // No triggers defined
      }
      
      for (const trigger of schema.triggers) {
        await this.run(trigger);
        if (this.verbose) {
          const triggerName = trigger.match(/CREATE TRIGGER IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
          console.log(`Trigger created: ${triggerName}`);
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.error('Failed to create triggers:', error);
      }
      throw error;
    }
  }

  /**
   * Insert initial data
   */
  async insertInitialData() {
    try {
      // Insert initial data only if event_types table is empty
      const count = await this.get('SELECT COUNT(*) as count FROM event_types');
      
      if (count.count === 0) {
        for (const eventType of initialData.event_types) {
          await this.run(
            'INSERT INTO event_types (code, name, description) VALUES (?, ?, ?)',
            [eventType.code, eventType.name, eventType.description]
          );
        }
        if (this.verbose) {
          console.log('Initial event types inserted');
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.error('Failed to insert initial data:', error);
      }
      throw error;
    }
  }

  /**
   * Execute SQL (modification queries)
   */
  async run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Execute SQL (query for single row)
   */
  async get(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute SQL (query for multiple rows)
   */
  async all(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            if (this.verbose) {
              console.log('📪 Database connection closed');
            }
            this.db = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Check database status
   */
  isConnected() {
    return this.db !== null && this.isInitialized;
  }

  /**
   * Get database path
   */
  getPath() {
    return this.dbPath;
  }

  /**
   * Get database instance (.database property getter)
   */
  get database() {
    return this.db;
  }

  /**
   * Get event type ID
   */
  async getEventTypeId(eventTypeCode) {
    const row = await this.get(
      'SELECT id FROM event_types WHERE code = ?',
      [eventTypeCode]
    );
    return row ? row.id : null;
  }

  /**
   * File record retrieval or creation (FUNC-000 compliant)
   */
  async getOrCreateFile(filePath, fileName, directory, inode = null) {
    // FUNC-000: files table only has id, inode, is_active
    // Need to find by checking events table for file_path
    let file = await this.get(`
      SELECT DISTINCT f.id, f.inode, f.is_active, e.id as last_event_id
      FROM files f
      LEFT JOIN events e ON f.id = e.file_id
      WHERE e.file_path = ? AND f.is_active = 1
      ORDER BY e.timestamp DESC
      LIMIT 1`,
      [filePath]
    );
    
    if (!file) {
      // Create new file record (FUNC-000 compliant)
      const result = await this.run(`
        INSERT INTO files (inode, is_active)
        VALUES (?, 1)`,
        [inode]
      );
      
      file = {
        id: result.lastID,
        inode: inode,
        is_active: 1,
        last_event_id: null
      };
    }
    
    return file;
  }

  /**
   * Record event (Legacy API - Transaction processing)
   */
  async recordEventLegacy(eventData) {
    const { event_type, file_path, file_name, directory, ...metadata } = eventData;
    
    // Wait for transaction completion to avoid conflicts
    while (this.transactionActive) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    this.transactionActive = true;
    
    try {
      // Begin transaction
      await this.run('BEGIN TRANSACTION');
      // 1. Get or create file record
      let file = await this.getOrCreateFile(file_path, file_name, directory, metadata.inode);
      
      // 2. Get event type ID
      const eventTypeId = await this.getEventTypeId(event_type);
      if (!eventTypeId) {
        throw new Error(`Unknown event type: ${event_type}`);
      }
      
      // 3. Record event
      const eventResult = await this.run(`
        INSERT INTO events (
          timestamp, event_type_id, file_id, file_path, 
          file_name, directory
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          metadata.timestamp || Date.now(),
          eventTypeId,
          file.id,
          file_path,
          file_name,
          directory
        ]
      );
      
      // 4. Record measurements
      if (metadata.file_size !== undefined || metadata.line_count !== undefined) {
        await this.run(`
          INSERT INTO measurements (
            event_id, file_size, line_count, block_count, inode
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            eventResult.lastID,
            metadata.file_size,
            metadata.line_count,
            metadata.block_count,
            metadata.inode
          ]
        );
      }
      
      // 5. Update files table
      await this.updateFile(file.id, eventResult.lastID, event_type, metadata.inode);
      
      // 6. Update aggregates
      await this.updateAggregates(file.id, event_type, metadata);
      
      await this.run('COMMIT');
      
      return eventResult.lastID;
      
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    } finally {
      this.transactionActive = false;
    }
  }

  /**
   * File information update (FUNC-000 compliant)
   */
  async updateFile(fileId, eventId, eventType, inode = null) {
    const updates = [];
    const params = [];
    
    // FUNC-000: files table has only inode and is_active
    if (eventType === 'delete') {
      updates.push('is_active = FALSE');
    } else if (eventType === 'create' || eventType === 'restore' || eventType === 'find') {
      updates.push('is_active = TRUE');
    }
    
    if (inode !== null && inode !== undefined) {
      updates.push('inode = ?');
      params.push(inode);
    }
    
    if (updates.length > 0) {
      params.push(fileId);
      
      await this.run(
        `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
  }

  /**
   * Update aggregates (FUNC-000 compliant)
   */
  async updateAggregates(fileId, eventType, metadata) {
    // Check for existing record
    const existing = await this.get(
      'SELECT * FROM aggregates WHERE file_id = ?',
      [fileId]
    );
    
    if (existing) {
      // Build update query (FUNC-000 schema compliant)
      const updates = ['last_updated = CURRENT_TIMESTAMP'];
      const params = [];
      
      // Increment total events
      updates.push('total_events = total_events + 1');
      
      // Event type specific counters (FUNC-000 compliant)
      switch (eventType) {
        case 'find':
          // Find events only increment total_events (no specific counter in FUNC-000)
          break;
        case 'create':
          updates.push('total_creates = total_creates + 1');
          break;
        case 'modify':
          updates.push('total_modifies = total_modifies + 1');
          break;
        case 'move':
          updates.push('total_moves = total_moves + 1');
          break;
        case 'delete':
          updates.push('total_deletes = total_deletes + 1');
          break;
        case 'restore':
          updates.push('total_restores = total_restores + 1');
          break;
      }
      
      // Update cumulative statistics (FUNC-000 compliant)
      if (metadata.file_size !== undefined) {
        updates.push('total_size = ?');
        params.push(metadata.file_size);
      }
      if (metadata.line_count !== undefined) {
        updates.push('total_lines = ?');
        params.push(metadata.line_count);
      }
      if (metadata.block_count !== undefined) {
        updates.push('total_blocks = ?');
        params.push(metadata.block_count);
      }
      
      params.push(fileId);
      
      await this.run(
        `UPDATE aggregates SET ${updates.join(', ')} WHERE file_id = ?`,
        params
      );
    } else {
      // Create new record (FUNC-000 compliant)
      let insertQuery;
      let params;
      
      if (eventType === 'find') {
        // Find events only increment total_events
        insertQuery = `
          INSERT INTO aggregates (
            file_id, total_size, total_lines, total_blocks, total_events
          ) VALUES (?, ?, ?, ?, 1)`;
        params = [
          fileId,
          metadata.file_size || 0,
          metadata.line_count || 0,
          metadata.block_count || 0
        ];
      } else {
        // Other events increment both total_events and specific counter
        const eventColumn = `total_${eventType}s`;
        insertQuery = `
          INSERT INTO aggregates (
            file_id, total_size, total_lines, total_blocks,
            total_events, ${eventColumn}
          ) VALUES (?, ?, ?, ?, 1, 1)`;
        params = [
          fileId,
          metadata.file_size || 0,
          metadata.line_count || 0,
          metadata.block_count || 0
        ];
      }
      
      await this.run(insertQuery, params);
    }
  }

  /**
   * Get recent events list
   */
  async getRecentEvents(limit = 50) {
    return await this.all(`
      SELECT 
        e.id,
        e.timestamp,
        et.code as event_type,
        et.name as event_name,
        e.file_path,
        e.file_name,
        e.directory,
        m.file_size,
        m.line_count,
        m.block_count,
        m.inode,
        f.id as file_id
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      JOIN files f ON e.file_id = f.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?
    `, [limit]);
  }


  /**
   * Find file by path (FUNC-000 compliant)
   */
  async findByPath(filePath) {
    return await this.get(`
      SELECT DISTINCT
        f.id as file_id, 
        f.inode,
        f.is_active,
        MAX(e.timestamp) as last_event_timestamp
      FROM files f
      JOIN events e ON f.id = e.file_id
      WHERE e.file_path = ?
      GROUP BY f.id
      ORDER BY last_event_timestamp DESC
      LIMIT 1
    `, [filePath]);
  }

  /**
   * Get all live files (FUNC-000 compliant)
   */
  async getLiveFiles() {
    return await this.all(`
      SELECT DISTINCT
        f.id as file_id,
        e.file_path,
        e.file_name,
        e.directory,
        f.inode
      FROM files f
      JOIN events e ON f.id = e.file_id
      WHERE f.is_active = TRUE
      AND e.id = (
        SELECT MAX(e2.id) 
        FROM events e2 
        WHERE e2.file_id = f.id
      )
      ORDER BY e.file_path
    `);
  }



  /**
   * Get all event types
   */
  async getAllEventTypes() {
    return await this.all('SELECT id, code, name, description FROM event_types');
  }

  /**
   * Migration from old database (compatibility method)
   */
  async getOrCreateObjectId(inode, filePath = null) {
    // Not used in v0.2.0 (handled directly by recordEvent)
    console.warn('getOrCreateObjectId is deprecated in v0.2.0');
    return null;
  }

  /**
   * Legacy event insertion (compatibility method)
   */
  async insertEvent(eventData) {
    // Use recordEvent in v0.2.0
    console.warn('insertEvent is deprecated in v0.2.0, use recordEvent instead');
    
    // Convert legacy format data to new format
    const newEventData = {
      event_type: eventData.event_type || 'unknown',
      file_path: eventData.file_path,
      file_name: eventData.file_name,
      directory: eventData.directory,
      timestamp: eventData.timestamp,
      source_path: eventData.source_path,
      file_size: eventData.file_size,
      line_count: eventData.line_count,
      block_count: eventData.block_count,
      inode: eventData.inode
    };
    
    return await this.recordEvent(newEventData);
  }

  /**
   * Legacy statistics update (compatibility method)
   */
  async updateObjectStatistics(objectId, stats) {
    // Automatically handled in v0.2.0
    console.warn('updateObjectStatistics is deprecated in v0.2.0');
  }

  /**
   * Enable WAL mode for concurrent access (FUNC-003)
   */
  async enableWALMode() {
    try {
      // Enable WAL mode for concurrent read/write access
      await this.run('PRAGMA journal_mode = WAL');
      
      // Set WAL checkpoint mode to RESTART for better performance
      await this.run('PRAGMA wal_checkpoint_mode = RESTART');
      
      // Set synchronous to NORMAL for better performance with WAL
      await this.run('PRAGMA synchronous = NORMAL');
      
      // Set WAL autocheckpoint (number of WAL pages before auto-checkpoint)
      await this.run('PRAGMA wal_autocheckpoint = 1000');
      
      if (this.verbose) {
        console.log('WAL mode enabled for concurrent access');
      }
    } catch (error) {
      if (this.verbose) {
        console.error('Failed to enable WAL mode:', error);
      }
      throw error;
    }
  }

  /**
   * Get total event count
   */
  async getEventCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM events',
        [],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.count : 0);
          }
        }
      );
    });
  }

  /**
   * Get events in batches for progressive loading
   */
  async getEventsBatch(offset, limit) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          e.id,
          e.timestamp,
          e.file_path,
          e.file_name,
          e.directory,
          et.code as event_type,
          m.file_size,
          m.line_count,
          m.block_count
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        ORDER BY e.timestamp DESC
        LIMIT ? OFFSET ?
      `;
      
      this.db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get recent events with better diversity
   * Prioritizes showing different event types and files
   */
  async getRecentEvents(limit = 50) {
    console.log(`[DatabaseManager] getRecentEvents called with limit ${limit}, using DB: ${this.dbPath}`);
    return new Promise((resolve, reject) => {
      // Get recent events but ensure we show diverse event types
      // This query gets the most recent event for each file, up to limit
      const query = `
        WITH recent_files AS (
          SELECT DISTINCT file_id, MAX(id) as max_event_id
          FROM events
          GROUP BY file_id
          ORDER BY max_event_id DESC
          LIMIT ?
        )
        SELECT 
          e.id,
          e.timestamp,
          e.file_path,
          e.file_name,
          e.directory,
          et.code as event_type,
          m.file_size,
          m.line_count,
          m.block_count
        FROM events e
        JOIN recent_files rf ON e.id = rf.max_event_id
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        ORDER BY e.timestamp DESC
      `;
      
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          // Fallback to simple query if CTE fails
          console.warn('Recent events query failed, using fallback:', err);
          this.getEventsBatch(0, limit).then(resolve).catch(reject);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err && this.verbose) {
            console.error('Error closing database:', err);
          } else if (this.verbose) {
            console.log('📪 Database connection closed');
          }
          this.db = null;
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }

  /**
   * Wait for database connection with timeout
   * Critical for preventing race conditions
   */
  async waitForConnection(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await this.testConnection();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw new Error('Database connection timeout');
  }

  /**
   * Test actual database connection
   * Verifies that the database is ready for operations
   */
  async testConnection() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database instance not available'));
        return;
      }
      
      this.db.get('SELECT 1', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Wait for initialization completion (for test environments)
   * Ensures both flag and actual connection are ready
   */
  async waitForInitialization(timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.isInitialized) {
        // Flag confirmed, now test actual connection
        try {
          await this.testConnection();
          return true;
        } catch (error) {
          // Flag is true but connection failed → reset flag
          this.isInitialized = false;
          if (this.verbose) {
            console.warn('Database flag was true but connection failed, resetting flag');
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Database initialization timeout');
  }

  /**
   * HO-20250628-002: Ensure file exists in database and return file ID
   * @param {string} filePath - Absolute path to file
   * @returns {Promise<number>} File ID
   */
  async ensureFile(filePath) {
    // Check if file exists in files table by finding through events
    let file = await this.get(`
      SELECT DISTINCT f.id, f.inode, f.is_active
      FROM files f
      LEFT JOIN events e ON f.id = e.file_id
      WHERE e.file_path = ? AND f.is_active = 1
      ORDER BY e.timestamp DESC
      LIMIT 1`,
      [filePath]
    );
    
    if (!file) {
      // Create new file record (FUNC-000 compliant)
      const result = await this.run(`
        INSERT INTO files (inode, is_active)
        VALUES (NULL, 1)`,
        []
      );
      
      return result.lastID;
    }
    
    return file.id;
  }


  /**
   * HO-20250628-002: Get aggregate statistics for file
   * @param {number} fileId - File ID
   * @returns {Promise<Object|null>} Aggregate statistics or null if not found
   */
  async getAggregateStats(fileId) {
    const stats = await this.get(
      'SELECT * FROM aggregates WHERE file_id = ?',
      [fileId]
    );
    
    return stats || null;
  }

  /**
   * Compatibility wrapper for existing event-processor.js usage
   * Delegates to recordEventLegacy for backward compatibility
   */
  async recordEvent(eventDataOrFileId, eventType, measurements) {
    // Check if this is the new API call (fileId, eventType, measurements)
    if (typeof eventDataOrFileId === 'number' && typeof eventType === 'string') {
      // New API: recordEvent(fileId, eventType, measurements)
      return this.recordEventById(eventDataOrFileId, eventType, measurements);
    } else {
      // Legacy API: recordEvent(eventData)
      return this.recordEventLegacy(eventDataOrFileId);
    }
  }

  /**
   * HO-20250628-002: New API implementation
   */
  async recordEventById(fileId, eventType, measurements = {}) {
    // Wait for transaction to complete if active
    while (this.transactionActive) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    this.transactionActive = true;
    
    try {
      await this.run('BEGIN TRANSACTION');
      
      // Get event type ID
      const eventTypeId = await this.getEventTypeId(eventType);
      if (!eventTypeId) {
        throw new Error(`Unknown event type: ${eventType}`);
      }
      
      // Insert into events table
      const eventResult = await this.run(`
        INSERT INTO events (
          timestamp, event_type_id, file_id, file_path, 
          file_name, directory
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Date.now(),
          eventTypeId,
          fileId,
          measurements.file_path || '',
          measurements.file_name || '',
          measurements.directory || ''
        ]
      );
      
      // Insert into measurements table (if measurements provided)
      if (measurements && (measurements.file_size !== undefined || 
                          measurements.line_count !== undefined || 
                          measurements.block_count !== undefined)) {
        await this.run(`
          INSERT INTO measurements (
            event_id, file_size, line_count, block_count, inode
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            eventResult.lastID,
            measurements.file_size,
            measurements.line_count,
            measurements.block_count,
            measurements.inode
          ]
        );
      }
      
      await this.run('COMMIT');
      
      return eventResult.lastID;
      
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    } finally {
      this.transactionActive = false;
    }
  }
}

module.exports = DatabaseManager;
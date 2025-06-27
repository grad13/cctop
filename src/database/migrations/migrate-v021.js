/**
 * Migration to v0.2.1: Aggregates Table Extension
 * HO-20250627-003: Add First/Max/Last metrics to aggregates table
 */

class MigrationV021 {
  constructor(db) {
    this.db = db;
    this.version = '0.2.1';
  }

  /**
   * Execute migration to v0.2.1
   * @returns {Promise<boolean>} Success status
   */
  async migrate() {
    try {
      console.log('[Migration] Starting v0.2.1 migration...');
      
      // Check if migration already applied
      if (await this.isAlreadyMigrated()) {
        console.log('[Migration] v0.2.1 already applied, skipping');
        return true;
      }
      
      // Execute ALTER TABLE statements
      await this.addNewColumns();
      
      // Re-calculate existing data statistics
      await this.recalculateExistingData();
      
      // Mark migration as complete
      await this.markMigrationComplete();
      
      console.log('[Migration] v0.2.1 migration completed successfully');
      return true;
      
    } catch (error) {
      console.error('[Migration] v0.2.1 migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if migration already applied
   */
  async isAlreadyMigrated() {
    try {
      // Check if new columns exist
      const tableInfo = await this.db.all("PRAGMA table_info(aggregates)");
      const columnNames = tableInfo.map(col => col.name);
      
      const requiredColumns = [
        'first_event_timestamp', 'last_event_timestamp',
        'first_size', 'max_size', 'last_size',
        'first_lines', 'max_lines', 'last_lines', 
        'first_blocks', 'max_blocks', 'last_blocks'
      ];
      
      return requiredColumns.every(col => columnNames.includes(col));
    } catch (error) {
      return false;
    }
  }

  /**
   * Add new columns to aggregates table
   */
  async addNewColumns() {
    const alterStatements = [
      // Time series columns
      'ALTER TABLE aggregates ADD COLUMN first_event_timestamp INTEGER',
      'ALTER TABLE aggregates ADD COLUMN last_event_timestamp INTEGER',
      
      // Size metrics
      'ALTER TABLE aggregates ADD COLUMN first_size INTEGER',
      'ALTER TABLE aggregates ADD COLUMN max_size INTEGER', 
      'ALTER TABLE aggregates ADD COLUMN last_size INTEGER',
      
      // Lines metrics
      'ALTER TABLE aggregates ADD COLUMN first_lines INTEGER',
      'ALTER TABLE aggregates ADD COLUMN max_lines INTEGER',
      'ALTER TABLE aggregates ADD COLUMN last_lines INTEGER',
      
      // Blocks metrics
      'ALTER TABLE aggregates ADD COLUMN first_blocks INTEGER',
      'ALTER TABLE aggregates ADD COLUMN max_blocks INTEGER',
      'ALTER TABLE aggregates ADD COLUMN last_blocks INTEGER'
    ];

    for (const statement of alterStatements) {
      try {
        await this.db.run(statement);
        console.log('[Migration] Successfully executed:', statement);
      } catch (error) {
        // Ignore "duplicate column name" errors (column already exists)
        if (!error.message.includes('duplicate column name')) {
          throw error;
        }
        console.log('[Migration] Column already exists, skipping:', statement);
      }
    }
  }

  /**
   * Re-calculate statistics for existing data
   */
  async recalculateExistingData() {
    console.log('[Migration] Re-calculating existing data statistics...');
    
    // Get all existing aggregates records
    const aggregates = await this.db.all('SELECT file_id FROM aggregates');
    
    for (const aggregate of aggregates) {
      await this.recalculateFileStatistics(aggregate.file_id);
    }
    
    console.log(`[Migration] Re-calculated statistics for ${aggregates.length} files`);
  }

  /**
   * Re-calculate statistics for a specific file
   */
  async recalculateFileStatistics(fileId) {
    try {
      // Get time series data for this file
      const timeStats = await this.db.get(`
        SELECT 
          MIN(timestamp) as first_timestamp,
          MAX(timestamp) as last_timestamp
        FROM events 
        WHERE file_id = ?
      `, [fileId]);

      // Get measurement statistics for this file
      const measurementStats = await this.db.get(`
        SELECT 
          MIN(m.file_size) as first_size,
          MAX(m.file_size) as max_size,
          MIN(m.line_count) as first_lines,
          MAX(m.line_count) as max_lines,
          MIN(m.block_count) as first_blocks,
          MAX(m.block_count) as max_blocks
        FROM measurements m
        JOIN events e ON m.event_id = e.id
        WHERE e.file_id = ?
        ORDER BY e.timestamp
      `, [fileId]);

      // Get last measurements
      const lastMeasurement = await this.db.get(`
        SELECT m.file_size, m.line_count, m.block_count
        FROM measurements m
        JOIN events e ON m.event_id = e.id
        WHERE e.file_id = ?
        ORDER BY e.timestamp DESC
        LIMIT 1
      `, [fileId]);

      // Update aggregates with calculated values
      await this.db.run(`
        UPDATE aggregates SET
          first_event_timestamp = ?,
          last_event_timestamp = ?,
          first_size = ?,
          max_size = ?,
          last_size = ?,
          first_lines = ?,
          max_lines = ?,
          last_lines = ?,
          first_blocks = ?,
          max_blocks = ?,
          last_blocks = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE file_id = ?
      `, [
        timeStats?.first_timestamp,
        timeStats?.last_timestamp,
        measurementStats?.first_size,
        measurementStats?.max_size,
        lastMeasurement?.file_size,
        measurementStats?.first_lines,
        measurementStats?.max_lines,
        lastMeasurement?.line_count,
        measurementStats?.first_blocks,
        measurementStats?.max_blocks,
        lastMeasurement?.block_count,
        fileId
      ]);

    } catch (error) {
      console.error(`[Migration] Failed to recalculate stats for file ${fileId}:`, error);
      // Continue with other files
    }
  }

  /**
   * Mark migration as complete
   */
  async markMigrationComplete() {
    // Create migrations table if not exists
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Mark this version as applied
    await this.db.run(`
      INSERT OR REPLACE INTO schema_migrations (version, applied_at) 
      VALUES (?, CURRENT_TIMESTAMP)
    `, [this.version]);
  }
}

module.exports = MigrationV021;
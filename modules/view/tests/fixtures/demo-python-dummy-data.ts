/**
 * Demo: Python Dummy Data Integration
 * Demonstrates loading and using Python-generated dummy data
 */

import { DatabaseAdapter } from '../../src/database/database-adapter';
import * as path from 'path';

interface EventSummary {
  id: number;
  timestamp: string;
  event_type: string;
  file_path: string;
  file_size: number | null;
  line_count: number | null;
}

interface DatabaseStats {
  total_events: number;
  total_files: number;
  event_types: Record<string, number>;
  date_range: { start: string; end: string };
  avg_file_size: number;
  avg_line_count: number;
}

export class PythonDummyDataDemo {
  private dbAdapter: DatabaseAdapter;
  
  constructor(dbPath: string) {
    this.dbAdapter = new DatabaseAdapter(dbPath);
  }
  
  async connect(): Promise<void> {
    await this.dbAdapter.connect();
  }
  
  async close(): Promise<void> {
    await this.dbAdapter.close();
  }
  
  /**
   * Get recent events from Python-generated data
   */
  async getRecentEvents(limit: number = 20): Promise<EventSummary[]> {
    const query = `
      SELECT 
        e.id,
        datetime(e.timestamp, 'unixepoch') as timestamp,
        et.code as event_type,
        e.file_path,
        m.file_size,
        m.line_count
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?
    `;
    
    const rows = await this.dbAdapter.query(query, [limit]);
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      event_type: row.event_type,
      file_path: row.file_path,
      file_size: row.file_size,
      line_count: row.line_count
    }));
  }
  
  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const queries = {
      totalEvents: "SELECT COUNT(*) as count FROM events",
      totalFiles: "SELECT COUNT(*) as count FROM files",
      eventTypes: `
        SELECT et.code, COUNT(*) as count 
        FROM events e 
        JOIN event_types et ON e.event_type_id = et.id 
        GROUP BY et.code 
        ORDER BY count DESC
      `,
      dateRange: `
        SELECT 
          datetime(MIN(timestamp), 'unixepoch') as start,
          datetime(MAX(timestamp), 'unixepoch') as end
        FROM events
      `,
      avgMetrics: `
        SELECT 
          AVG(file_size) as avg_size,
          AVG(line_count) as avg_lines
        FROM measurements
      `
    };
    
    const [totalEvents, totalFiles, eventTypes, dateRange, avgMetrics] = await Promise.all([
      this.executeQuery(queries.totalEvents),
      this.executeQuery(queries.totalFiles),
      this.executeQuery(queries.eventTypes),
      this.executeQuery(queries.dateRange),
      this.executeQuery(queries.avgMetrics)
    ]);
    
    return {
      total_events: totalEvents[0].count,
      total_files: totalFiles[0].count,
      event_types: eventTypes.reduce((acc: Record<string, number>, row: any) => {
        acc[row.code] = row.count;
        return acc;
      }, {}),
      date_range: {
        start: dateRange[0].start,
        end: dateRange[0].end
      },
      avg_file_size: Math.round(avgMetrics[0].avg_size || 0),
      avg_line_count: Math.round(avgMetrics[0].avg_lines || 0)
    };
  }
  
  /**
   * Get file activity timeline for specific file types
   */
  async getFileTypeActivity(fileExtension: string, limit: number = 10): Promise<EventSummary[]> {
    const query = `
      SELECT 
        e.id,
        datetime(e.timestamp, 'unixepoch') as timestamp,
        et.code as event_type,
        e.file_path,
        m.file_size,
        m.line_count
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      WHERE e.file_path LIKE ?
      ORDER BY e.timestamp DESC
      LIMIT ?
    `;
    
    const rows = await this.dbAdapter.query(query, [`%${fileExtension}`, limit]);
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      event_type: row.event_type,
      file_path: row.file_path,
      file_size: row.file_size,
      line_count: row.line_count
    }));
  }
  
  /**
   * Get activity by hour of day
   */
  async getActivityByHour(): Promise<Array<{ hour: number; count: number }>> {
    const query = `
      SELECT 
        CAST(strftime('%H', datetime(timestamp, 'unixepoch')) AS INTEGER) as hour,
        COUNT(*) as count
      FROM events
      GROUP BY hour
      ORDER BY hour
    `;
    
    const rows = await this.dbAdapter.query(query, []);
    return rows.map(row => ({
      hour: row.hour,
      count: row.count
    }));
  }
  
  private async executeQuery(query: string): Promise<any[]> {
    return await this.dbAdapter.query(query, []);
  }
}

/**
 * Demo function to showcase Python dummy data integration
 */
async function demonstratePythonDummyData() {
  console.log('=== Python Dummy Data Integration Demo ===\n');
  
  const dummyDbPath = path.join(process.cwd(), '.cctop', 'data', 'activity.db');
  const demo = new PythonDummyDataDemo(dummyDbPath);
  
  try {
    await demo.connect();
    console.log(`✓ Connected to Python-generated database: ${dummyDbPath}\n`);
    
    // 1. Show database statistics
    console.log('📊 Database Statistics:');
    const stats = await demo.getDatabaseStats();
    console.log(`  Total Events: ${stats.total_events}`);
    console.log(`  Total Files: ${stats.total_files}`);
    console.log(`  Date Range: ${stats.date_range.start} → ${stats.date_range.end}`);
    console.log(`  Avg File Size: ${stats.avg_file_size} bytes`);
    console.log(`  Avg Line Count: ${stats.avg_line_count} lines`);
    console.log();
    
    // 2. Show event type distribution
    console.log('📈 Event Type Distribution:');
    Object.entries(stats.event_types)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / stats.total_events) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
      });
    console.log();
    
    // 3. Show recent events
    console.log('🕒 Recent Events (Last 10):');
    const recentEvents = await demo.getRecentEvents(10);
    recentEvents.forEach((event, index) => {
      const size = event.file_size ? `${event.file_size}B` : 'N/A';
      const lines = event.line_count ? `${event.line_count}L` : 'N/A';
      console.log(`  ${index + 1}. [${event.event_type}] ${event.file_path} (${size}, ${lines}) - ${event.timestamp}`);
    });
    console.log();
    
    // 4. Show TypeScript file activity
    console.log('🎯 TypeScript File Activity:');
    const tsActivity = await demo.getFileTypeActivity('.ts', 5);
    if (tsActivity.length > 0) {
      tsActivity.forEach((event, index) => {
        console.log(`  ${index + 1}. [${event.event_type}] ${event.file_path} - ${event.timestamp}`);
      });
    } else {
      console.log('  No TypeScript files found in dummy data');
    }
    console.log();
    
    // 5. Show activity by hour
    console.log('⏰ Activity by Hour of Day:');
    const hourlyActivity = await demo.getActivityByHour();
    const maxCount = Math.max(...hourlyActivity.map(h => h.count));
    
    hourlyActivity.forEach(({ hour, count }) => {
      const barLength = Math.round((count / maxCount) * 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      console.log(`  ${hour.toString().padStart(2, '0')}:00 [${bar}] ${count}`);
    });
    console.log();
    
    // 6. Show sample CCTOP CLI query
    console.log('🔍 Sample CCTOP CLI Query Simulation:');
    console.log('  Query: Show recent modifications to source files');
    const modifyEvents = await demo.getFileTypeActivity('.js', 3);
    const tsModifyEvents = await demo.getFileTypeActivity('.ts', 3);
    const pyModifyEvents = await demo.getFileTypeActivity('.py', 3);
    
    const allSourceEvents = [...modifyEvents, ...tsModifyEvents, ...pyModifyEvents]
      .filter(e => e.event_type === 'modify')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    if (allSourceEvents.length > 0) {
      allSourceEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.file_path} (${event.file_size}B) - ${event.timestamp}`);
      });
    } else {
      console.log('  No recent source file modifications found');
    }
    console.log();
    
    console.log('✅ Demo completed successfully!');
    console.log('💡 The dummy data demonstrates realistic file activity patterns');
    console.log('🔧 This data can be used for testing CCTOP CLI functionality');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await demo.close();
  }
}

// Run demo if called directly
if (require.main === module) {
  demonstratePythonDummyData().catch(console.error);
}

export { demonstratePythonDummyData };
import { DatabaseConnection } from './connection';
import { FileEvent, ProjectInfo } from '../types';
import { QUERIES } from '../schema';

export class FileEventRepository {
  constructor(private db: DatabaseConnection) {}

  async insertEvent(event: FileEvent): Promise<void> {
    const params = [
      event.timestamp,
      event.eventType,
      event.projectPath,
      event.fullPath,
      event.relativePath,
      event.isDirectory ? 1 : 0,
      event.size,
      event.lineCount,
      event.extension,
      event.depth,
      event.inode,
      event.parentDir,
      event.oldPath || null
    ];

    await this.db.run(QUERIES.INSERT_EVENT, params);
  }

  async insertEventsBatch(events: FileEvent[]): Promise<void> {
    const db = this.db.getDatabase();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(QUERIES.INSERT_EVENT);
        
        for (const event of events) {
          stmt.run([
            event.timestamp,
            event.eventType,
            event.projectPath,
            event.fullPath,
            event.relativePath,
            event.isDirectory ? 1 : 0,
            event.size,
            event.lineCount,
            event.extension,
            event.depth,
            event.inode,
            event.parentDir,
            event.oldPath || null
          ], (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
          });
        }

        stmt.finalize((err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    });
  }

  async getRecentEvents(limit: number = 100): Promise<FileEvent[]> {
    const rows = await this.db.all<any>(QUERIES.GET_RECENT_EVENTS, [limit]);
    
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      projectPath: row.project_path,
      fullPath: row.full_path,
      relativePath: row.relative_path,
      isDirectory: row.is_directory === 1,
      size: row.size,
      lineCount: row.line_count,
      extension: row.extension,
      depth: row.depth,
      inode: row.inode,
      parentDir: row.parent_dir,
      oldPath: row.old_path
    }));
  }

  async getProjectStats(projectPath: string): Promise<Omit<ProjectInfo, 'name' | 'gitBranch'>> {
    const result = await this.db.get<any>(QUERIES.GET_PROJECT_STATS, [projectPath]);
    
    return {
      path: projectPath,
      totalFiles: result?.total_files || 0,
      totalDirectories: result?.total_directories || 0,
      totalSize: result?.total_size || 0,
      lastActivity: new Date().toISOString()
    };
  }

  async deleteOldEvents(): Promise<void> {
    await this.db.run(QUERIES.DELETE_OLD_EVENTS);
  }
}
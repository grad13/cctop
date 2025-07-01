import { Database } from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CREATE_TABLES_SQL, ENABLE_WAL_MODE_SQL } from '../schema';

export class DatabaseConnection {
  private db: Database | null = null;
  private dbPath: string;
  private readonly isReadOnly: boolean;

  constructor(dbPath: string, isReadOnly: boolean = false) {
    this.dbPath = dbPath;
    this.isReadOnly = isReadOnly;
  }

  async connect(): Promise<void> {
    await this.ensureDirectoryExists();
    
    const mode = this.isReadOnly 
      ? Database.OPEN_READONLY 
      : Database.OPEN_READWRITE | Database.OPEN_CREATE;

    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, mode, async (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
          return;
        }

        try {
          if (!this.isReadOnly) {
            await this.initialize();
          }
          resolve();
        } catch (initError) {
          reject(initError);
        }
      });
    });
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    try {
      await fs.access(dir);
    } catch {
      if (!this.isReadOnly) {
        await fs.mkdir(dir, { recursive: true });
      } else {
        throw new Error(`Database directory does not exist: ${dir}`);
      }
    }
  }

  private async initialize(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const runAsync = promisify(this.db.run.bind(this.db));
    const execAsync = promisify(this.db.exec.bind(this.db));

    // Enable WAL mode for better concurrency
    await execAsync(ENABLE_WAL_MODE_SQL);

    // Create tables if they don't exist
    await execAsync(CREATE_TABLES_SQL);
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  getDatabase(): Database {
    if (!this.db) throw new Error('Database not connected');
    return this.db;
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    if (this.isReadOnly) throw new Error('Cannot write to read-only database');

    const runAsync = promisify(this.db.run.bind(this.db));
    await runAsync(sql, params);
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not connected');

    const getAsync = promisify(this.db.get.bind(this.db));
    return getAsync(sql, params) as Promise<T | undefined>;
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');

    const allAsync = promisify(this.db.all.bind(this.db));
    return allAsync(sql, params) as Promise<T[]>;
  }
}
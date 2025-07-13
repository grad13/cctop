/**
 * File Event Reader
 * Delegated database operations for file events
 */
export class FileEventReader {
  constructor(private dbPath: string) {}

  async getLatestEvents(limit: number = 50, mode: 'all' | 'unique' = 'all', offset: number = 0, filters?: string[]): Promise<any[]> {
    // Delegate to EventQueryAdapter for complex queries
    const { EventQueryAdapter } = await import('./EventQueryAdapter');
    const adapter = new EventQueryAdapter(this.dbPath);
    await adapter.connect();
    try {
      return await adapter.getLatestEvents(limit, mode, offset, filters);
    } finally {
      await adapter.disconnect();
    }
  }

  async searchEvents(params: {
    keyword: string;
    filters?: string[];
    mode?: 'all' | 'unique';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    // Delegate to EventQueryAdapter for search operations
    const { EventQueryAdapter } = await import('./EventQueryAdapter');
    const adapter = new EventQueryAdapter(this.dbPath);
    await adapter.connect();
    try {
      return await adapter.searchEvents(params);
    } finally {
      await adapter.disconnect();
    }
  }
}
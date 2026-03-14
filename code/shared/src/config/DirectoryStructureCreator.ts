/**
 * Directory Structure Creator
 * Creates .cctop/ directory structure
 */

import * as fs from 'fs';
import * as path from 'path';

const DIRECTORIES = [
  '',                    // .cctop/
  'config',             // config files
  'themes',             // color themes
  'themes/custom',      // user custom themes
  'data',               // database files
  'logs',               // log files
  'cache',              // cache files
  'runtime',            // runtime files (PID, socket)
  'temp'                // temporary files
];

export class DirectoryStructureCreator {
  create(configPath: string): void {
    for (const dir of DIRECTORIES) {
      const fullPath = path.join(configPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
      }
    }
  }
}

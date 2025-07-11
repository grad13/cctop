/**
 * Demo Data Generator with Japanese file names
 */

import { EventRow } from '../types/event-row';

export class DemoDataGenerator {
  private eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
  
  private fileNames = [
    // English files
    'index.ts', 'app.js', 'config.json', 'README.md', 'package.json',
    'component.tsx', 'utils.js', 'style.css', 'main.py', 'test.spec.js',
    // Documentation files
    'API-design.md', 'specification.txt', 'main-styles.css', 'utilities.ts',
    'test-file.spec.js', 'documentation.md', 'development-guide.pdf',
    'new-feature.tsx', 'bug-fix.js', 'refactoring.ts',
    // Complex names
    'user-management.tsx', 'config-settings.json', 'test-suite.js'
  ];
  
  private directories = [
    // Short paths
    'src/', 'test/', 'docs/', 'lib/', 'config/', 'assets/',
    'src/components/', 'src/utils/', 'test/unit/', 'docs/api/',
    'documentation/', 'specs/', 'tests/', 'source/',
    
    // Long paths for testing
    '/project/my-app/modules/cli/src/ui/components/',
    '/very/long/path/to/deeply/nested/project/structure/src/database/models/',
    '/development/projects/enterprise/application/backend/services/api/v2/',
    '/var/www/html/applications/production/releases/2025-07-04/dist/assets/images/',
    '/opt/kubernetes/clusters/production/namespaces/default/deployments/backend/',
    
    // Additional long paths for testing
    '/workspace/projects/enterprise/source/frontend/components/shared/',
    '/documents/specifications/detailed/screens/admin/user-management/',
    '/system/production/applications/backend/services/authentication/',
    
    // Complex project structures
    '/projects/feature-development/frontend/src/components/dashboard/',
    '/workspace/projects/project-xyz/backend/api/v2/endpoints/'
  ];
  
  private eventId = 1;

  generateEvents(count: number): EventRow[] {
    const events: EventRow[] = [];
    
    for (let i = 0; i < count; i++) {
      events.push(this.generateSingleEvent());
    }
    
    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  generateSingleEvent(): EventRow {
    const now = Date.now();
    const randomTime = now - Math.random() * 300000; // Within 5 minutes
    
    return {
      id: this.eventId++,
      timestamp: new Date(randomTime).toISOString(),
      filename: this.randomChoice(this.fileNames),
      directory: this.randomChoice(this.directories),
      event_type: this.randomChoice(this.eventTypes),
      size: Math.floor(Math.random() * 50000) + 100,
      lines: Math.floor(Math.random() * 1000) + 10,
      blocks: Math.floor(Math.random() * 100) + 1,
      inode: Math.floor(Math.random() * 1000000) + 100000,
      elapsed_ms: 0
    };
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
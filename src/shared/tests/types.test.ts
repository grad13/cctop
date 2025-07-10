/**
 * Types validation tests
 */

import { describe, it, expect } from 'vitest';
import { FileEvent, EventRow, Config, DaemonConfig, DaemonState } from '../src/types';

describe('Types module', () => {
  describe('FileEvent interface', () => {
    it('should validate FileEvent structure', () => {
      const validFileEvent: FileEvent = {
        eventType: 'create',
        filePath: '/test/path/file.txt',
        directory: '/test/path',
        fileName: 'file.txt',
        fileSize: 1024,
        timestamp: new Date(),
        inodeNumber: 123456
      };

      expect(validFileEvent.eventType).toBe('create');
      expect(validFileEvent.filePath).toBe('/test/path/file.txt');
      expect(validFileEvent.fileSize).toBe(1024);
      expect(validFileEvent.inodeNumber).toBe(123456);
      expect(validFileEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should accept all valid event types', () => {
      const eventTypes: Array<FileEvent['eventType']> = [
        'find', 'create', 'modify', 'delete', 'move', 'restore'
      ];

      eventTypes.forEach(type => {
        const event: FileEvent = {
          eventType: type,
          filePath: '/test.txt',
          directory: '/',
          fileName: 'test.txt',
          fileSize: 0,
          timestamp: new Date(),
          inodeNumber: 0
        };
        expect(event.eventType).toBe(type);
      });
    });
  });

  describe('EventRow interface', () => {
    it('should validate EventRow structure', () => {
      const validEventRow: EventRow = {
        id: 1,
        timestamp: '2025-07-08T08:00:00.000Z',
        fileName: 'test.txt',
        directory: '/test',
        event_type: 'create',
        size: 1024,
        inode: 123456,
        elapsed_ms: 100
      };

      expect(validEventRow.id).toBe(1);
      expect(validEventRow.event_type).toBe('create');
      expect(validEventRow.size).toBe(1024);
      expect(validEventRow.inode).toBe(123456);
    });

    it('should support both string and number timestamps', () => {
      const stringTimestamp: EventRow = {
        id: 1,
        timestamp: '2025-07-08T08:00:00.000Z',
        fileName: 'test.txt',
        directory: '/test',
        event_type: 'create',
        size: 0,
        inode: 0,
        elapsed_ms: 0
      };

      const numberTimestamp: EventRow = {
        id: 2,
        timestamp: 1720425600000,
        fileName: 'test.txt',
        directory: '/test',
        event_type: 'modify',
        size: 0,
        inode: 0,
        elapsed_ms: 0
      };

      expect(typeof stringTimestamp.timestamp).toBe('string');
      expect(typeof numberTimestamp.timestamp).toBe('number');
    });
  });

  describe('DaemonConfig interface', () => {
    it('should validate DaemonConfig structure', () => {
      const validConfig: DaemonConfig = {
        version: '0.3.0',
        monitoring: {
          watchPaths: ['/test'],
          excludePatterns: ['*.tmp'],
          debounceMs: 100,
          maxDepth: 10,
          moveThresholdMs: 100,
          systemLimits: {
            requiredLimit: 8192,
            checkOnStartup: true,
            warnIfInsufficient: true
          }
        },
        daemon: {
          pidFile: '/tmp/cctop.pid',
          logFile: '/tmp/cctop.log',
          logLevel: 'info',
          heartbeatInterval: 30000,
          autoStart: true
        },
        database: {
          path: '/tmp/cctop.db',
          writeMode: 'wal',
          syncMode: 'normal',
          cacheSize: 2000,
          busyTimeout: 30000
        }
      };

      expect(validConfig.version).toBe('0.3.0');
      expect(validConfig.monitoring.watchPaths).toContain('/test');
      expect(validConfig.daemon.pidFile).toBe('/tmp/cctop.pid');
      expect(validConfig.database.path).toBe('/tmp/cctop.db');
    });
  });
});
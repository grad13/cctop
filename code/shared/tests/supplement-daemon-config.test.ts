/**
 * Tests for DaemonConfig - Daemon Configuration Type Definition
 * Based on: documents/spec/shared/supplement-daemon-config.md
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { DaemonConfig, defaultDaemonConfig } from '../../code/shared/src/config/DaemonConfig';

describe('DaemonConfig - Daemon Configuration Type Definition', () => {
  describe('defaultDaemonConfig structure', () => {
    it('should have a version string', () => {
      expect(typeof defaultDaemonConfig.version).toBe('string');
      expect(defaultDaemonConfig.version).toBe('0.5.2.6');
    });

    it('should have monitoring, daemon, and database sections', () => {
      expect(defaultDaemonConfig).toHaveProperty('monitoring');
      expect(defaultDaemonConfig).toHaveProperty('daemon');
      expect(defaultDaemonConfig).toHaveProperty('database');
    });
  });

  describe('macOS FSEvents tuning options', () => {
    it('should support optional useFsEvents field', () => {
      const config: DaemonConfig = {
        ...defaultDaemonConfig,
        monitoring: {
          ...defaultDaemonConfig.monitoring,
          useFsEvents: false,
        },
      };
      expect(config.monitoring.useFsEvents).toBe(false);
    });

    it('should support optional usePolling field', () => {
      const config: DaemonConfig = {
        ...defaultDaemonConfig,
        monitoring: {
          ...defaultDaemonConfig.monitoring,
          usePolling: true,
        },
      };
      expect(config.monitoring.usePolling).toBe(true);
    });

    it('should support optional ignoreInitial field', () => {
      const config: DaemonConfig = {
        ...defaultDaemonConfig,
        monitoring: {
          ...defaultDaemonConfig.monitoring,
          ignoreInitial: true,
        },
      };
      expect(config.monitoring.ignoreInitial).toBe(true);
    });

    it('should support optional startupDelayMs field', () => {
      const config: DaemonConfig = {
        ...defaultDaemonConfig,
        monitoring: {
          ...defaultDaemonConfig.monitoring,
          startupDelayMs: 3000,
        },
      };
      expect(config.monitoring.startupDelayMs).toBe(3000);
    });
  });

  describe('system limits configuration', () => {
    it('should have requiredLimit of 524288 file descriptors', () => {
      expect(defaultDaemonConfig.monitoring.systemLimits.requiredLimit).toBe(524288);
    });

    it('should have checkOnStartup as true', () => {
      expect(defaultDaemonConfig.monitoring.systemLimits.checkOnStartup).toBe(true);
    });

    it('should have warnIfInsufficient as true', () => {
      expect(defaultDaemonConfig.monitoring.systemLimits.warnIfInsufficient).toBe(true);
    });
  });

  describe('daemon lifecycle management', () => {
    it('should have autoStart as true', () => {
      expect(defaultDaemonConfig.daemon.autoStart).toBe(true);
    });

    it('should have maxRestarts of 3', () => {
      expect(defaultDaemonConfig.daemon.maxRestarts).toBe(3);
    });

    it('should have restartDelay of 5000 ms', () => {
      expect(defaultDaemonConfig.daemon.restartDelay).toBe(5000);
    });

    it('should have logLevel of "info"', () => {
      expect(defaultDaemonConfig.daemon.logLevel).toBe('info');
    });

    it('should have heartbeatInterval of 30000 ms', () => {
      expect(defaultDaemonConfig.daemon.heartbeatInterval).toBe(30000);
    });

    it('should have pidFile path', () => {
      expect(defaultDaemonConfig.daemon.pidFile).toBe('.cctop/runtime/daemon.pid');
    });

    it('should have logFile path', () => {
      expect(defaultDaemonConfig.daemon.logFile).toBe('.cctop/logs/daemon.log');
    });
  });

  describe('database performance tuning', () => {
    it('should have writeMode of "WAL"', () => {
      expect(defaultDaemonConfig.database.writeMode).toBe('WAL');
    });

    it('should have syncMode of "NORMAL"', () => {
      expect(defaultDaemonConfig.database.syncMode).toBe('NORMAL');
    });

    it('should have cacheSize of 65536 pages', () => {
      expect(defaultDaemonConfig.database.cacheSize).toBe(65536);
    });

    it('should have busyTimeout of 5000 ms', () => {
      expect(defaultDaemonConfig.database.busyTimeout).toBe(5000);
    });

    it('should have checkpointInterval of 300000 ms (5 min)', () => {
      expect(defaultDaemonConfig.database.checkpointInterval).toBe(300000);
    });
  });

  describe('default exclude patterns', () => {
    it('should include **/node_modules/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/node_modules/**');
    });

    it('should include **/.git/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/.git/**');
    });

    it('should include **/.* (all dotfiles)', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/.*');
    });

    it('should include **/.cctop/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/.cctop/**');
    });

    it('should include **/dist/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/dist/**');
    });

    it('should include **/coverage/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/coverage/**');
    });

    it('should include **/build/**', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/build/**');
    });

    it('should include **/*.log', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/*.log');
    });

    it('should include **/.DS_Store', () => {
      expect(defaultDaemonConfig.monitoring.excludePatterns).toContain('**/.DS_Store');
    });
  });

  describe('monitoring defaults', () => {
    it('should have debounceMs of 100', () => {
      expect(defaultDaemonConfig.monitoring.debounceMs).toBe(100);
    });

    it('should have moveThresholdMs of 100', () => {
      expect(defaultDaemonConfig.monitoring.moveThresholdMs).toBe(100);
    });

    it('should have maxDepth of 10', () => {
      expect(defaultDaemonConfig.monitoring.maxDepth).toBe(10);
    });
  });

  describe('no side effects', () => {
    it('should be a pure data export with no functions', () => {
      expect(typeof defaultDaemonConfig).toBe('object');
      const ownMethods = Object.values(defaultDaemonConfig).filter(v => typeof v === 'function');
      expect(ownMethods).toHaveLength(0);
    });
  });
});

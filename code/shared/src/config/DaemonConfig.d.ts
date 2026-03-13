/**
 * Daemon Configuration Interface
 * Per FUNC-106 specification
 */
export interface DaemonConfig {
    version: string;
    monitoring: {
        watchPaths: string[];
        excludePatterns: string[];
        debounceMs: number;
        maxDepth: number;
        moveThresholdMs: number;
        systemLimits: {
            requiredLimit: number;
            checkOnStartup: boolean;
            warnIfInsufficient: boolean;
        };
    };
    daemon: {
        pidFile: string;
        logFile: string;
        logLevel: string;
        heartbeatInterval: number;
        autoStart: boolean;
        maxRestarts: number;
        restartDelay: number;
    };
    database: {
        writeMode: string;
        syncMode: string;
        cacheSize: number;
        busyTimeout: number;
        checkpointInterval: number;
    };
}
export declare const defaultDaemonConfig: DaemonConfig;

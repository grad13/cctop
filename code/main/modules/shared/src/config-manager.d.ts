/**
 * Configuration Manager for .cctop directory initialization
 * Unified configuration management
 */
export interface CctopConfig {
    daemon: {
        pidFile: string;
        logFile: string;
        heartbeatInterval: number;
    };
    database: {
        path: string;
        walMode: boolean;
        timeout: number;
    };
    monitoring: {
        watchPaths: string[];
        excludePatterns: string[];
        maxDepth: number;
        moveThresholdMs: number;
    };
    ui: {
        refreshInterval: number;
        maxRows: number;
        theme: string;
    };
}
export declare class ConfigManager {
    private workingDirectory;
    private static readonly DEFAULT_CONFIG;
    constructor(workingDirectory?: string);
    /**
     * Initialize .cctop directory structure and configuration
     * Standard compliant directory structure
     */
    initializeCctopStructure(): Promise<void>;
    /**
     * Ensure all required configuration files exist
     */
    private ensureConfigFiles;
    /**
     * Ensure all required theme files exist
     */
    private ensureThemeFiles;
    /**
     * Create .gitignore for runtime files
     */
    private createGitignore;
    /**
     * Load configuration from file
     */
    loadConfig(): CctopConfig;
    /**
     * Save configuration to file
     */
    saveConfig(config: CctopConfig): void;
    /**
     * Get database path (absolute)
     */
    getDatabasePath(): string;
    /**
     * Get PID file path (absolute)
     */
    getPidFilePath(): string;
    /**
     * Get log file path (absolute)
     */
    getLogFilePath(): string;
    /**
     * Check if .cctop directory is initialized
     */
    isInitialized(): boolean;
    /**
     * Merge user config with defaults
     */
    private mergeWithDefaults;
}

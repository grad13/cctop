/**
 * Shared Configuration Interface
 * Per FUNC-101 specification
 * Common settings used by both daemon and CLI
 */
export interface SharedConfig {
    version: string;
    project?: {
        name: string;
        description: string;
    };
    database: {
        path: string;
        maxSize?: number;
    };
    directories?: {
        config: string;
        themes: string;
        data: string;
        logs: string;
        runtime: string;
        temp: string;
    };
    logging?: {
        maxFileSize: number;
        maxFiles: number;
        datePattern: string;
    };
    projectName?: string;
    watchPaths?: string[];
    excludePatterns?: string[];
    createdAt?: string;
}
export declare const defaultSharedConfig: SharedConfig;

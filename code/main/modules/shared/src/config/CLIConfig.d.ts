/**
 * CLI Configuration Interface
 * Per FUNC-107 specification
 */
export interface CLIConfig {
    version: string;
    display: {
        maxRows: number;
        refreshInterval: number;
        refreshRateMs: number;
        showTimestamps: boolean;
        dateFormat: string;
        columnWidths: {
            time: number;
            event: number;
            size: number;
            path: number;
        };
        columns: {
            timestamp: {
                visible: boolean;
                width: number;
            };
            elapsed: {
                visible: boolean;
                width: number;
            };
            fileName: {
                visible: boolean;
                width: number;
            };
            event: {
                visible: boolean;
                width: number;
            };
            lines: {
                visible: boolean;
                width: number;
            };
            blocks: {
                visible: boolean;
                width: number;
            };
            size: {
                visible: boolean;
                width: number;
            };
            directory: {
                visible: boolean;
                width: number;
            };
        };
        directoryMutePaths?: string[];
    };
    interaction: {
        enableMouse: boolean;
        enableKeyboard: boolean;
        scrollSpeed: number;
    };
    colors: {
        info: string;
        success: string;
        warning: string;
        error: string;
        find: string;
        create: string;
        modify: string;
        delete: string;
        move: string;
        restore: string;
    };
    logFile?: string;
    refreshInterval?: number;
    maxRows?: number;
    displayMode?: string;
    colorEnabled?: boolean;
}
export declare const defaultCLIConfig: CLIConfig;

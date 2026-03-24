/**
 * Local Setup Initializer
 * Handles automatic creation of .cctop/ directory structure and initial configuration
 */
export interface SetupResult {
    success: boolean;
    created: boolean;
    configPath: string;
    message: string;
}
export interface LocalSetupConfig {
    targetDirectory?: string;
    dryRun?: boolean;
}
export declare class LocalSetupInitializer {
    private readonly DEFAULT_DIRECTORY;
    /**
     * Initialize local setup with .cctop/ directory structure
     */
    initialize(options?: LocalSetupConfig): Promise<SetupResult>;
    /**
     * Create .cctop/ directory structure
     */
    private createDirectoryStructure;
    /**
     * Create initial configuration files (3-layer architecture)
     */
    private createConfigurationFiles;
    /**
     * Create .gitignore file for .cctop/ directory
     */
    private createGitIgnore;
    /**
     * Generate success message
     */
    private generateSuccessMessage;
    /**
     * Generate dry-run message
     */
    private generateDryRunMessage;
    /**
     * Check if .cctop/ directory exists and is valid
     */
    isInitialized(targetDirectory?: string): boolean;
}

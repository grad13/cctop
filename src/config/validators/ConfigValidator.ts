/**
 * Configuration Validator
 * Validates configuration against schema and business rules
 */

import * as path from 'path';
import {
  FullConfig,
  ConfigValidationResult,
  ConfigError,
  ConfigErrorType,
  REQUIRED_FIELDS,
  VALIDATION_SCHEMA,
  ValidationRule
} from '../types/ConfigTypes';

export class ConfigValidator {
  private verbose: boolean;

  constructor() {
    this.verbose = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): ConfigValidationResult {
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Config must be a non-null object'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required fields
      const missingFields = this.checkRequiredFields(config);
      errors.push(...missingFields);

      // Validate field types and constraints
      const schemaErrors = this.validateAgainstSchema(config);
      errors.push(...schemaErrors);

      // Custom business rule validation
      const customErrors = this.validateCustomRules(config);
      errors.push(...customErrors);

      // Generate warnings
      const configWarnings = this.generateWarnings(config);
      warnings.push(...configWarnings);

      const result: ConfigValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      if (errors.length === 0) {
        result.normalizedConfig = this.normalizeConfig(config);
      }

      if (this.verbose) {
        console.log('[ConfigValidator] Validation result:', {
          valid: result.valid,
          errorCount: errors.length,
          warningCount: warnings.length
        });
      }

      return result;
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Check required fields
   */
  private checkRequiredFields(config: any): string[] {
    const errors: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      const value = this.getNestedValue(config, field);
      if (value === null || value === undefined || value === '') {
        errors.push(`Required field missing: ${field}`);
      }
    }

    return errors;
  }

  /**
   * Validate against schema rules
   */
  private validateAgainstSchema(config: any): string[] {
    const errors: string[] = [];

    for (const rule of VALIDATION_SCHEMA) {
      const value = this.getNestedValue(config, rule.path);
      
      // Skip if not required and not present
      if (!rule.required && (value === null || value === undefined)) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${rule.path} must be ${rule.type}, got ${actualType}`);
        continue;
      }

      // Number constraints
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.path} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.path} must be at most ${rule.max}`);
        }
      }

      // String pattern
      if (rule.type === 'string' && rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.path} does not match required pattern`);
      }

      // Custom validator
      if (rule.validator && !rule.validator(value)) {
        errors.push(`${rule.path} failed validation`);
      }
    }

    return errors;
  }

  /**
   * Validate custom business rules
   */
  private validateCustomRules(config: any): string[] {
    const errors: string[] = [];

    // Check watchPaths is non-empty array
    if (config.monitoring?.watchPaths) {
      if (!Array.isArray(config.monitoring.watchPaths)) {
        errors.push('monitoring.watchPaths must be an array');
      } else if (config.monitoring.watchPaths.length === 0) {
        errors.push('monitoring.watchPaths must not be empty');
      }
    }

    // Check database path doesn't overlap with watch paths
    // Note: Allow .cctop directory to be within watch paths since it's excluded by default
    if (config.database?.path && config.monitoring?.watchPaths) {
      const dbPath = config.database.path;
      const dbDir = path.dirname(dbPath);
      
      // Skip validation if database is in .cctop directory (which is excluded by default)
      if (!dbDir.includes('.cctop')) {
        for (const watchPath of config.monitoring.watchPaths) {
          const absWatchPath = path.resolve(watchPath);
          const absDbDir = path.resolve(dbDir);
          
          if (absDbDir.startsWith(absWatchPath) || absWatchPath.startsWith(absDbDir)) {
            errors.push(`Database path ${dbPath} overlaps with watch path ${watchPath}`);
          }
        }
      }
    }

    // Validate display.maxEvents
    if (config.display?.maxEvents !== undefined) {
      if (config.display.maxEvents <= 0) {
        errors.push('display.maxEvents must be positive');
      }
    }

    return errors;
  }

  /**
   * Generate configuration warnings
   */
  private generateWarnings(config: any): string[] {
    const warnings: string[] = [];

    // Performance warnings
    if (config.monitoring?.debounceMs !== undefined && config.monitoring.debounceMs < 50) {
      warnings.push('Very low debounceMs may impact performance');
    }

    if (config.display?.refreshRateMs !== undefined && config.display.refreshRateMs < 100) {
      warnings.push('Very low refreshRateMs may impact performance');
    }

    // Large limits
    if (config.display?.maxEvents > 100) {
      warnings.push('Large maxEvents value may impact display performance');
    }

    if (config.monitoring?.maxDepth > 20) {
      warnings.push('Large maxDepth value may slow down file scanning');
    }

    // Security warnings
    if (config.backgroundMonitor?.logLevel === 'debug') {
      warnings.push('Debug logging may expose sensitive information');
    }

    return warnings;
  }

  /**
   * Normalize configuration
   */
  private normalizeConfig(config: any): FullConfig {
    // Deep clone to avoid mutations
    const normalized = JSON.parse(JSON.stringify(config));

    // Normalize paths to absolute
    if (normalized.database?.path) {
      normalized.database.path = path.resolve(normalized.database.path);
    }

    if (normalized.monitoring?.watchPaths) {
      normalized.monitoring.watchPaths = normalized.monitoring.watchPaths.map(
        (p: string) => path.resolve(p)
      );
    }

    // Ensure arrays
    if (normalized.monitoring?.excludePatterns && !Array.isArray(normalized.monitoring.excludePatterns)) {
      normalized.monitoring.excludePatterns = [normalized.monitoring.excludePatterns];
    }

    return normalized as FullConfig;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Validate specific section
   */
  validateSection(section: string, value: any): string[] {
    const tempConfig = { [section]: value };
    const result = this.validateConfig(tempConfig);
    return result.errors;
  }

  /**
   * Check if configuration is minimal valid
   */
  isMinimalValid(config: any): boolean {
    // Only check absolutely required fields
    const requiredPaths = ['monitoring.watchPaths', 'database.path'];
    
    for (const path of requiredPaths) {
      const value = this.getNestedValue(config, path);
      if (!value) return false;
    }

    return true;
  }
}
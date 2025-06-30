/**
 * Configuration module exports
 */

export { loadConfiguration, applyCliOverrides } from './loader';
export { deepMerge, ArrayMergeStrategy, applyCliArgs } from './merger';
export { validateShared, validateDaemon, validateCli, ValidationResult } from './validator';

// Re-export types
export type {
  SharedConfig,
  DaemonConfig,
  CliConfig,
  CompleteConfig,
  ConfigLoadOptions
} from '../types';
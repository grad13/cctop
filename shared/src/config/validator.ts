/**
 * Configuration validation using JSON Schema
 */

import Ajv from 'ajv';
import { SharedConfig, DaemonConfig, CliConfig } from '../types';

const ajv = new Ajv({ allErrors: true, useDefaults: true });

/**
 * Shared configuration schema
 */
const sharedConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['version', 'project', 'database', 'directories'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+\\.\\d+$'
    },
    project: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' }
      }
    },
    database: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
        maxSize: { type: 'integer', minimum: 1048576 }
      }
    },
    directories: {
      type: 'object',
      required: ['config', 'logs', 'temp'],
      properties: {
        config: { type: 'string' },
        logs: { type: 'string' },
        temp: { type: 'string' }
      }
    },
    logging: {
      type: 'object',
      properties: {
        maxFileSize: { type: 'integer', minimum: 1048576 },
        maxFiles: { type: 'integer', minimum: 1 },
        datePattern: { type: 'string' }
      }
    }
  }
};

/**
 * Daemon configuration schema
 */
const daemonConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['watch'],
  properties: {
    watch: {
      type: 'object',
      required: ['enabled', 'paths', 'ignore', 'followSymlinks'],
      properties: {
        enabled: { type: 'boolean' },
        paths: {
          type: 'array',
          items: { type: 'string' }
        },
        ignore: {
          type: 'array',
          items: { type: 'string' }
        },
        followSymlinks: { type: 'boolean' },
        depth: { type: 'integer', minimum: 0 }
      }
    },
    polling: {
      type: 'object',
      properties: {
        interval: { type: 'number', minimum: 100 },
        usePolling: { type: 'boolean' }
      }
    },
    process: {
      type: 'object',
      properties: {
        autoRestart: { type: 'boolean' },
        restartDelay: { type: 'number', minimum: 0 },
        maxRestarts: { type: 'integer', minimum: 0 }
      }
    }
  }
};

/**
 * CLI configuration schema
 */
const cliConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['display', 'polling'],
  properties: {
    display: {
      type: 'object',
      required: ['refreshRate', 'maxRows', 'showHidden'],
      properties: {
        refreshRate: { type: 'number', minimum: 10 },
        maxRows: { type: 'integer', minimum: 1 },
        showHidden: { type: 'boolean' }
      }
    },
    polling: {
      type: 'object',
      required: ['interval'],
      properties: {
        interval: { type: 'number', minimum: 10 }
      }
    },
    colors: {
      type: 'object',
      properties: {
        theme: { type: 'string' }
      }
    }
  }
};

// Compile validators
const validateSharedConfig = ajv.compile<SharedConfig>(sharedConfigSchema);
const validateDaemonConfig = ajv.compile<DaemonConfig>(daemonConfigSchema);
const validateCliConfig = ajv.compile<CliConfig>(cliConfigSchema);

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate shared configuration
 */
export function validateShared(config: any): ValidationResult {
  const valid = validateSharedConfig(config);
  return {
    valid,
    errors: valid ? undefined : formatErrors(validateSharedConfig.errors)
  };
}

/**
 * Validate daemon configuration
 */
export function validateDaemon(config: any): ValidationResult {
  const valid = validateDaemonConfig(config);
  return {
    valid,
    errors: valid ? undefined : formatErrors(validateDaemonConfig.errors)
  };
}

/**
 * Validate CLI configuration
 */
export function validateCli(config: any): ValidationResult {
  const valid = validateCliConfig(config);
  return {
    valid,
    errors: valid ? undefined : formatErrors(validateCliConfig.errors)
  };
}

/**
 * Format AJV errors into readable messages
 */
function formatErrors(errors: any[] | null | undefined): string[] {
  if (!errors) return [];
  
  return errors.map(err => {
    const path = err.instancePath || 'root';
    const message = err.message || 'Invalid value';
    return `${path}: ${message}`;
  });
}
import { z } from 'zod';

/**
 * Config Schema Validation
 * 仕様書: documents/visions/specifications/system/a005-configuration-system-specification-v2.md
 */

export const ConfigSchema = z.object({
  version: z.string().min(1),
  
  monitoring: z.object({
    watchPaths: z.array(z.string()),
    excludePatterns: z.array(z.string()),
    debounceMs: z.number().min(1).max(10000),
    maxDepth: z.number().min(1).max(100)
  }),
  
  database: z.object({
    path: z.string().min(1),
    mode: z.enum(['WAL', 'DELETE', 'TRUNCATE'])
  }),
  
  display: z.object({
    maxEvents: z.number().min(1).max(1000),
    refreshRateMs: z.number().min(1).max(5000)
  })
});

/**
 * Config必須フィールド検証
 */
export const ConfigRequiredFieldsSchema = z.object({
  database: z.object({
    path: z.string().min(1)
  }),
  display: z.object({
    maxEvents: z.number().positive()
  }),
  monitoring: z.object({
    watchPaths: z.array(z.string())
  })
});

/**
 * Config値範囲検証
 */
export const ConfigValueRangesSchema = z.object({
  monitoring: z.object({
    debounceMs: z.number().min(1).max(10000),
    maxDepth: z.number().min(1).max(100)
  }),
  display: z.object({
    maxEvents: z.number().min(1).max(1000),
    refreshRateMs: z.number().min(1).max(5000)
  })
});
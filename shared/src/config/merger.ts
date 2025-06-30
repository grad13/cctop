/**
 * Configuration merge utilities
 */

/**
 * Deep merge strategy for arrays
 */
export enum ArrayMergeStrategy {
  REPLACE = 'replace',    // Replace entire array
  CONCAT = 'concat',      // Concatenate arrays
  UNIQUE = 'unique',      // Concatenate and remove duplicates
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends object>(
  target: T,
  source: Partial<T>,
  arrayStrategy: ArrayMergeStrategy = ArrayMergeStrategy.REPLACE
): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue === undefined) {
        continue;
      }

      if (Array.isArray(sourceValue)) {
        result[key] = mergeArrays(
          targetValue as any,
          sourceValue,
          arrayStrategy
        ) as any;
      } else if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !isDate(sourceValue) &&
        !isRegExp(sourceValue)
      ) {
        result[key] = deepMerge(
          targetValue || {},
          sourceValue,
          arrayStrategy
        ) as any;
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Merge arrays based on strategy
 */
function mergeArrays<T>(
  target: T[] | undefined,
  source: T[],
  strategy: ArrayMergeStrategy
): T[] {
  if (!target) {
    return [...source];
  }

  switch (strategy) {
    case ArrayMergeStrategy.REPLACE:
      return [...source];
    
    case ArrayMergeStrategy.CONCAT:
      return [...target, ...source];
    
    case ArrayMergeStrategy.UNIQUE:
      const combined = [...target, ...source];
      return Array.from(new Set(combined));
    
    default:
      return [...source];
  }
}

/**
 * Check if value is a Date
 */
function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * Check if value is a RegExp
 */
function isRegExp(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Apply CLI arguments to configuration
 */
export function applyCliArgs<T extends object>(
  config: T,
  args: Record<string, any>
): T {
  const result = { ...config };

  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      setNestedValue(result, key, value);
    }
  }

  return result;
}

/**
 * Set a nested value using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
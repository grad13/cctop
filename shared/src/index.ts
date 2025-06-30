/**
 * @cctop/shared - Main export file
 * 
 * Shared modules for cctop daemon and CLI processes
 */

// Database exports
export * from './database';
export * as Database from './database';

// Schema exports
export * from './schema';
export * as Schema from './schema';

// Type exports
export * from './types';

// Config exports
export * from './config';
export * as Config from './config';

// Version info
export const version = '0.3.0';
export const description = 'Shared modules for cctop daemon and CLI';
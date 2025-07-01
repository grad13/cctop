/**
 * Utility Type Definitions for cctop
 * General utility types and helper interfaces
 */

// Promise resolver and rejector types
export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;

// Deferred promise interface
export interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: PromiseResolve<T>;
  reject: PromiseReject;
}

// Timer handle type
export type TimerHandle = NodeJS.Timeout | number;

// Cleanup function type
export type CleanupFunction = () => void | Promise<void>;

// Event emitter types
export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
}

// Logger interface
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
}

// Result type for operations that can fail
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Optional type helper
export type Optional<T> = T | null | undefined;

// Deep partial type helper
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Key-value pair
export interface KeyValue<T = any> {
  key: string;
  value: T;
}

// Range interface
export interface Range {
  start: number;
  end: number;
}

// Size interface
export interface Size {
  width: number;
  height: number;
}

// Position interface
export interface Position {
  x: number;
  y: number;
}

// Rectangle interface
export interface Rectangle extends Position, Size {}

// Disposable interface
export interface Disposable {
  dispose(): void | Promise<void>;
}

// Subscribable interface
export interface Subscribable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

// Observer interface
export interface Observer<T> {
  next(value: T): void;
  error?(err: Error): void;
  complete?(): void;
}

// Subscription interface
export interface Subscription {
  unsubscribe(): void;
}

// Cache interface
export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size: number;
}

// Async operation state
export interface AsyncOperationState<T> {
  loading: boolean;
  data?: T;
  error?: Error;
}

// Retry options
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

// Debounce options
export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

// Throttle options
export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}
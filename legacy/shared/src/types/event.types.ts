/**
 * Event-related type definitions
 */

/**
 * Event type codes
 */
export type EventTypeCode = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';

/**
 * Event type definition
 */
export interface EventType {
  id: number;
  code: EventTypeCode;
  name: string;
  description?: string;
}

/**
 * File event data
 */
export interface FileEvent {
  id?: number;
  timestamp: number;
  eventTypeId: number;
  fileId: number;
  filePath: string;
  fileName: string;
  directory: string;
}

/**
 * Event with type information
 */
export interface FileEventWithType extends FileEvent {
  eventType: EventType;
}

/**
 * Event creation parameters
 */
export interface CreateEventParams {
  eventType: EventTypeCode;
  filePath: string;
  fileId?: number;
  timestamp?: number;
}
import * as winston from 'winston';
import * as path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export function configureLogger(logDir: string, maxFileSize: number, maxFiles: number): void {
  // Add file transport
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'daemon.log'),
    maxsize: maxFileSize,
    maxFiles: maxFiles,
    format: logFormat
  }));

  // Add error file transport
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'daemon-error.log'),
    level: 'error',
    maxsize: maxFileSize,
    maxFiles: maxFiles,
    format: logFormat
  }));
}
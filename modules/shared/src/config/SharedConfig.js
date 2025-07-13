"use strict";
/**
 * Shared Configuration Interface
 * Per FUNC-101 specification
 * Common settings used by both daemon and CLI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSharedConfig = void 0;
exports.defaultSharedConfig = {
    version: "0.5.2.6",
    project: {
        name: "cctop",
        description: "Code Change Top - Real-time file monitoring tool"
    },
    database: {
        path: ".cctop/data/activity.db",
        maxSize: 104857600 // 100MB
    },
    directories: {
        config: ".cctop/config",
        themes: ".cctop/themes",
        data: ".cctop/data",
        logs: ".cctop/logs",
        runtime: ".cctop/runtime",
        temp: ".cctop/temp"
    },
    logging: {
        maxFileSize: 10485760, // 10MB
        maxFiles: 5,
        datePattern: "YYYY-MM-DD"
    }
};

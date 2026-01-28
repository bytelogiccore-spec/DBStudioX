// Event types for Tauri IPC

export interface DataChangeEvent {
    table: string;
    operation: DataOperation;
    rowid: number;
    timestamp: string;
}

export type DataOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PerformanceEvent {
    timestamp: string;
    metrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
    cacheHitRate: number;
    queryCount: number;
    avgQueryTimeMs: number;
    connectionCount: number;
    memoryUsageBytes: number;
    walCheckpointCount: number;
}

export interface DatabaseStats {
    cacheHitRate: number;
    cacheHitCount: number;
    cacheMissCount: number;
    queryCount: number;
    avgQueryTimeMs: number;
    maxQueryTimeMs: number;
    minQueryTimeMs: number;
    connectionPoolSize: number;
    activeConnections: number;
    memoryUsageBytes: number;
    walSize: number;
    lastCheckpoint: string;
}

export interface ErrorEvent {
    code: string;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

export interface ConnectionEvent {
    type: 'connected' | 'disconnected' | 'error';
    databasePath: string;
    timestamp: string;
    error?: string;
}

// Event listener types
export type EventCallback<T> = (event: T) => void;

export interface EventSubscription {
    unsubscribe: () => void;
}

// Log types
export interface LogEntry {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: string;
    source: string;
    metadata?: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

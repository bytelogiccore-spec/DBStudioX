/**
 * Tauri IPC wrapper for database operations
 * Provides type-safe communication with Rust backend
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
    QueryResult,
    DatabaseConnection,
    SchemaInfo,
    DatabaseStats,
    DataChangeEvent,
    PerformanceEvent,
    ErrorEvent,
    ConnectionEvent,
} from '@/types';

// Re-export types for convenience in stores
export type {
    QueryResult,
    DatabaseConnection,
    SchemaInfo,
    DatabaseStats,
} from '@/types';

// ============================================
// Database Commands
// ============================================

export async function connectDatabase(path: string): Promise<DatabaseConnection> {
    return invoke<DatabaseConnection>('connect_database', { path });
}

export async function disconnectDatabase(connectionId: string): Promise<void> {
    return invoke('disconnect_database', { connectionId });
}

export async function getDatabaseList(): Promise<DatabaseConnection[]> {
    return invoke<DatabaseConnection[]>('get_database_list');
}

// ============================================
// Query Commands
// ============================================

export async function executeQuery(
    connectionId: string,
    sql: string,
    params: unknown[] = []
): Promise<QueryResult> {
    return invoke<QueryResult>('execute_query', { connectionId, sql, params });
}

export async function executeQueryWithConnection(
    connectionId: string,
    sql: string,
    params: unknown[] = []
): Promise<QueryResult> {
    return executeQuery(connectionId, sql, params);
}

export async function explainQuery(sql: string): Promise<string> {
    return invoke<string>('explain_query', { sql });
}

// ============================================
// Transaction Commands
// ============================================

export async function beginTransaction(
    connectionId: string
): Promise<string> {
    return invoke<string>('begin_transaction', { connectionId });
}

export async function commitTransaction(transactionId: string): Promise<void> {
    return invoke('commit_transaction', { transactionId });
}

export async function rollbackTransaction(transactionId: string): Promise<void> {
    return invoke('rollback_transaction', { transactionId });
}

// ============================================
// Schema Commands
// ============================================

export async function getSchema(connectionId: string): Promise<SchemaInfo> {
    return invoke<SchemaInfo>('get_schema', { connectionId });
}

export async function getTableInfo(
    connectionId: string,
    tableName: string
): Promise<unknown> {
    return invoke('get_table_info', { connectionId, tableName });
}

// ============================================
// Stats Commands
// ============================================

export async function getStats(connectionId: string): Promise<DatabaseStats> {
    return invoke<DatabaseStats>('get_stats', { connectionId });
}

export async function clearCache(connectionId: string): Promise<void> {
    return invoke('clear_cache', { connectionId });
}

export async function setCacheEnabled(
    connectionId: string,
    enabled: boolean
): Promise<void> {
    return invoke('set_cache_enabled', { connectionId, enabled });
}

// ============================================
// Event Listeners
// ============================================

export async function onDataChange(
    callback: (event: DataChangeEvent) => void
): Promise<UnlistenFn> {
    return listen<DataChangeEvent>('db:data_changed', (event) => {
        callback(event.payload);
    });
}

export async function onPerformanceUpdate(
    callback: (event: PerformanceEvent) => void
): Promise<UnlistenFn> {
    return listen<PerformanceEvent>('db:perf_update', (event) => {
        callback(event.payload);
    });
}

export async function onError(
    callback: (event: ErrorEvent) => void
): Promise<UnlistenFn> {
    return listen<ErrorEvent>('db:error', (event) => {
        callback(event.payload);
    });
}

export async function onConnectionChange(
    callback: (event: ConnectionEvent) => void
): Promise<UnlistenFn> {
    return listen<ConnectionEvent>('db:connection', (event) => {
        callback(event.payload);
    });
}

// ============================================
// File Operations
// ============================================

export async function openFileDialog(): Promise<string | null> {
    return invoke<string | null>('open_file_dialog');
}

export async function saveFileDialog(defaultName: string): Promise<string | null> {
    return invoke<string | null>('save_file_dialog', { defaultName });
}

export async function createDatabaseDialog(defaultName: string): Promise<string | null> {
    return invoke<string | null>('create_database_dialog', { defaultName });
}

export async function exportQueryResult(
    result: QueryResult,
    format: 'csv' | 'json' | 'sql',
    outputPath: string
): Promise<void> {
    return invoke('export_query_result', { result, format, outputPath });
}

// ============================================
// Migration Operations
// ============================================

export interface MigrationStats {
    rowsProcessed: number;
    success: boolean;
    message: string;
}

export async function importData(
    connection_id: string,
    table_name: string,
    file_path: string,
    format: string
): Promise<MigrationStats> {
    return invoke<MigrationStats>('import_data', { connection_id, table_name, file_path, format });
}

export async function exportData(
    connection_id: string,
    table_name: string,
    file_path: string,
    format: string
): Promise<MigrationStats> {
    return invoke<MigrationStats>('export_data', { connection_id, table_name, file_path, format });
}

export async function copyTable(
    source_db_id: string,
    source_table: string,
    target_db_id: string,
    target_table: string,
    with_data: boolean
): Promise<MigrationStats> {
    return invoke<MigrationStats>('copy_table', {
        source_db_id,
        source_table,
        target_db_id,
        target_table,
        with_data
    });
}

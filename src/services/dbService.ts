import { ApiService } from './apiService';
import {
    DatabaseConnectionSchema,
    DatabaseConnection,
    DatabaseStatsSchema,
    DatabaseStats
} from '@/schemas/database';
import {
    QueryResultSchema,
    QueryResult,
    SchemaInfoSchema,
    SchemaInfo,
    TableInfoSchema,
    TableInfo
} from '@/schemas/query';
import { z } from 'zod';
import { UnlistenFn } from '@tauri-apps/api/event';

export class DatabaseService extends ApiService {
    // Database lifecycle
    async connect(path: string): Promise<DatabaseConnection> {
        return this.request('connect_database', { path }, DatabaseConnectionSchema);
    }

    async disconnect(connectionId: string): Promise<void> {
        return this.rawRequest('disconnect_database', { connectionId });
    }

    async listConnections(): Promise<DatabaseConnection[]> {
        return this.request('get_database_list', {}, z.array(DatabaseConnectionSchema));
    }

    async backup(connectionId: string, destPath: string): Promise<void> {
        return this.rawRequest('backup_database', { connectionId, destPath });
    }

    async restore(connectionId: string, srcPath: string): Promise<void> {
        return this.rawRequest('restore_database', { connectionId, srcPath });
    }

    // Queries
    async executeQuery(connectionId: string, sql: string, params: any[] = []): Promise<QueryResult> {
        return this.request('execute_query', { connectionId, sql, params }, QueryResultSchema);
    }

    async explainQuery(connectionId: string, sql: string): Promise<string> {
        return this.request('explain_query', { connectionId, sql }, z.string());
    }

    // Schema
    async getSchema(connectionId: string): Promise<SchemaInfo> {
        return this.request('get_schema', { connectionId }, SchemaInfoSchema);
    }

    async diffSchemas(connectionId: string, targetPath: string): Promise<any> {
        return this.rawRequest('diff_schemas', { sourceConnectionId: connectionId, targetPath });
    }

    async getTableInfo(connectionId: string, tableName: string): Promise<TableInfo> {
        return this.request('get_table_info', { connectionId, tableName }, TableInfoSchema);
    }

    // Transactions
    async beginTransaction(connectionId: string): Promise<string> {
        return this.request('begin_transaction', { connectionId }, z.string());
    }

    async commitTransaction(transactionId: string): Promise<void> {
        return this.rawRequest('commit_transaction', { transactionId });
    }

    async rollbackTransaction(transactionId: string): Promise<void> {
        return this.rawRequest('rollback_transaction', { transactionId });
    }

    // Stats
    async getStats(connectionId: string): Promise<DatabaseStats> {
        return this.request('get_stats', { connectionId }, DatabaseStatsSchema);
    }

    async clearCache(connectionId: string): Promise<void> {
        return this.rawRequest('clear_cache', { connectionId });
    }

    async setCacheEnabled(connectionId: string, enabled: boolean): Promise<void> {
        return this.rawRequest('set_cache_enabled', { connectionId, enabled });
    }

    // Events
    async onDataChange(callback: (payload: any) => void): Promise<UnlistenFn> {
        return this.listen('db:data_changed', callback);
    }

    async onPerformanceUpdate(callback: (payload: any) => void): Promise<UnlistenFn> {
        return this.listen('db:perf_update', callback);
    }

    async onError(callback: (payload: any) => void): Promise<UnlistenFn> {
        return this.listen('db:error', callback);
    }

    async onConnectionChange(callback: (payload: any) => void): Promise<UnlistenFn> {
        return this.listen('db:connection', callback);
    }
}

export const dbService = new DatabaseService();

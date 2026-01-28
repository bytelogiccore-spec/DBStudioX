// Query execution and history types
import type { QueryResult } from './database';

export interface Query {
    id: string;
    sql: string;
    params?: QueryParam[];
    createdAt: Date;
    executedAt?: Date;
    status: QueryStatus;
    result?: QueryResult;
    error?: QueryError;
}

export type QueryStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface QueryParam {
    index: number;
    value: ParamValue;
    type: ParamType;
}

export type ParamValue = string | number | boolean | null | Uint8Array;
export type ParamType = 'text' | 'integer' | 'real' | 'blob' | 'null';

export interface QueryError {
    code: string;
    message: string;
    line?: number;
    column?: number;
}

// Re-export QueryResult from database.ts
export type { QueryResult } from './database';

// Query History
export interface QueryHistoryItem {
    id: string;
    sql: string;
    databasePath: string;
    executedAt: Date;
    executionTimeMs: number;
    rowCount: number;
    status: 'success' | 'error';
    errorMessage?: string;
    isFavorite: boolean;
    tags: string[];
}

export interface QueryHistoryFilter {
    databasePath?: string;
    status?: 'success' | 'error' | 'all';
    dateFrom?: Date;
    dateTo?: Date;
    searchText?: string;
    favoritesOnly?: boolean;
    tags?: string[];
}

// Query Tab
export interface QueryTab {
    id: string;
    title: string;
    sql: string;
    databaseId?: string;
    isDirty: boolean;
    result?: QueryResult;
    isExecuting: boolean;
}


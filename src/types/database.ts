import { QueryResult, ColumnInfo, SchemaInfo, TableInfo, ViewInfo, IndexInfo, TriggerInfo } from '@/schemas/query';
import { DatabaseConnection } from '@/schemas/database';

export type {
    QueryResult,
    ColumnInfo,
    SchemaInfo,
    TableInfo,
    ViewInfo,
    IndexInfo,
    TriggerInfo,
    DatabaseConnection
};

export type ColumnType = string;

export type CellValue =
    | string
    | number
    | boolean
    | null
    | Uint8Array; // BLOB

export type Row = Record<string, CellValue>;

export interface QueryPlan {
    steps: QueryPlanStep[];
    estimatedCost: number;
}

export interface QueryPlanStep {
    id: number;
    parent: number;
    notused: number;
    detail: string;
}

// Transaction types
export interface Transaction {
    id: string;
    startedAt: Date;
    status: TransactionStatus;
}

export type TransactionStatus = 'active' | 'committed' | 'rolled_back';

/**
 * useQuery hook
 * Manages SQL query execution and results
 */

import { useState, useCallback } from 'react';
import { executeQuery, explainQuery } from '@/lib/tauri';
import type { QueryResult, QueryError } from '@/types';

interface UseQueryOptions {
    onSuccess?: (result: QueryResult) => void;
    onError?: (error: QueryError) => void;
}

interface UseQueryReturn {
    result: QueryResult | null;
    isExecuting: boolean;
    error: QueryError | null;
    executionTimeMs: number | null;
    execute: (connectionId: string, sql: string, params?: unknown[]) => Promise<QueryResult>;
    explain: (sql: string) => Promise<string>;
    clear: () => void;
}

export function useQuery(options: UseQueryOptions = {}): UseQueryReturn {
    const [result, setResult] = useState<QueryResult | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<QueryError | null>(null);
    const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

    const execute = useCallback(async (connectionId: string, sql: string, params?: unknown[]): Promise<QueryResult> => {
        setIsExecuting(true);
        setError(null);

        const startTime = performance.now();

        try {
            const queryResult = await executeQuery(connectionId, sql, params ?? []);
            const endTime = performance.now();

            setResult(queryResult);
            setExecutionTimeMs(endTime - startTime);
            options.onSuccess?.(queryResult);

            return queryResult;
        } catch (err) {
            const queryError: QueryError = {
                code: 'QUERY_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
            };

            setError(queryError);
            options.onError?.(queryError);

            throw queryError;
        } finally {
            setIsExecuting(false);
        }
    }, [options]);

    const explain = useCallback(async (sql: string): Promise<string> => {
        try {
            return await explainQuery(sql);
        } catch (err) {
            throw err;
        }
    }, []);

    const clear = useCallback(() => {
        setResult(null);
        setError(null);
        setExecutionTimeMs(null);
    }, []);

    return {
        result,
        isExecuting,
        error,
        executionTimeMs,
        execute,
        explain,
        clear,
    };
}

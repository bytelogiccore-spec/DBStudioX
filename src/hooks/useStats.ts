/**
 * useStats hook
 * Real-time database statistics and performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dbService } from '@/services/dbService';
import { onPerformanceUpdate } from '@/lib/tauri';
import { DatabaseStats } from '@/schemas/database';
import type { PerformanceMetrics } from '@/types';

interface UseStatsOptions {
    connectionId: string | null;
    autoRefresh?: boolean;
    refreshInterval?: number; // milliseconds
    historySize?: number;
}

interface UseStatsReturn {
    stats: DatabaseStats | null;
    history: PerformanceMetrics[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useStats(options: UseStatsOptions): UseStatsReturn {
    const {
        connectionId,
        autoRefresh = true,
        refreshInterval = 1000,
        historySize = 60,
    } = options;

    const [stats, setStats] = useState<DatabaseStats | null>(null);
    const [history, setHistory] = useState<PerformanceMetrics[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const historyRef = useRef<PerformanceMetrics[]>([]);

    const refresh = useCallback(async () => {
        if (!connectionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const newStats = await dbService.getStats(connectionId);
            setStats(newStats);

            // Add to history
            const metrics: PerformanceMetrics = {
                cacheHitRate: newStats.cacheHitRate,
                queryCount: newStats.queryCount,
                avgQueryTimeMs: newStats.avgQueryTimeMs,
                connectionCount: newStats.connectionPoolSize,
                memoryUsageBytes: newStats.memoryUsageBytes,
                walCheckpointCount: 0,
            };

            historyRef.current = [...historyRef.current.slice(-(historySize - 1)), metrics];
            setHistory(historyRef.current);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get stats');
        } finally {
            setIsLoading(false);
        }
    }, [connectionId, historySize]);

    // Auto refresh
    useEffect(() => {
        if (!autoRefresh || !connectionId) return;

        const interval = setInterval(refresh, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, connectionId, refresh, refreshInterval]);

    // Listen for performance events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        onPerformanceUpdate((event) => {
            historyRef.current = [...historyRef.current.slice(-(historySize - 1)), event.metrics];
            setHistory(historyRef.current);
        }).then(fn => { unlisten = fn; });

        return () => { unlisten?.(); };
    }, [historySize]);

    // Initial load
    useEffect(() => {
        if (connectionId) {
            refresh();
        }
    }, [connectionId, refresh]);

    return {
        stats,
        history,
        isLoading,
        error,
        refresh,
    };
}

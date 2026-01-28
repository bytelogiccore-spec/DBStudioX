/**
 * useEvents hook
 * Subscribe to database events (data changes, errors, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/services/dbService';
import type { DataChangeEvent, ErrorEvent, LogEntry } from '@/types';

interface UseEventsOptions {
    maxLogEntries?: number;
}

interface UseEventsReturn {
    dataChanges: DataChangeEvent[];
    errors: ErrorEvent[];
    logs: LogEntry[];
    clearDataChanges: () => void;
    clearErrors: () => void;
    clearLogs: () => void;
    clearAll: () => void;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
    const { maxLogEntries = 100 } = options;

    const [dataChanges, setDataChanges] = useState<DataChangeEvent[]>([]);
    const [errors, setErrors] = useState<ErrorEvent[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Listen for data change events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        dbService.onDataChange((event: DataChangeEvent) => {
            setDataChanges(prev => [...prev.slice(-(maxLogEntries - 1)), event]);

            // Also add to logs
            const logEntry: LogEntry = {
                id: crypto.randomUUID(),
                level: 'info',
                message: `${event.operation} on ${event.table} (rowid: ${event.rowid})`,
                timestamp: event.timestamp,
                source: 'data-change',
                metadata: { table: event.table, operation: event.operation, rowid: event.rowid },
            };
            setLogs(prev => [...prev.slice(-(maxLogEntries - 1)), logEntry]);
        }).then(fn => { unlisten = fn; });

        return () => { unlisten?.(); };
    }, [maxLogEntries]);

    // Listen for error events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        dbService.onError((event: ErrorEvent) => {
            setErrors(prev => [...prev.slice(-(maxLogEntries - 1)), event]);

            // Also add to logs
            const logEntry: LogEntry = {
                id: crypto.randomUUID(),
                level: 'error',
                message: `[${event.code}] ${event.message}`,
                timestamp: event.timestamp,
                source: 'error',
                metadata: event.context,
            };
            setLogs(prev => [...prev.slice(-(maxLogEntries - 1)), logEntry]);
        }).then(fn => { unlisten = fn; });

        return () => { unlisten?.(); };
    }, [maxLogEntries]);

    const clearDataChanges = useCallback(() => {
        setDataChanges([]);
    }, []);

    const clearErrors = useCallback(() => {
        setErrors([]);
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const clearAll = useCallback(() => {
        setDataChanges([]);
        setErrors([]);
        setLogs([]);
    }, []);

    return {
        dataChanges,
        errors,
        logs,
        clearDataChanges,
        clearErrors,
        clearLogs,
        clearAll,
    };
}

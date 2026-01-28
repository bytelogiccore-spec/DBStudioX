/**
 * useDatabase hook
 * Manages database connection state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { dbService } from '@/services/dbService';
import { onConnectionChange } from '@/lib/tauri';
import { DatabaseConnection } from '@/schemas/database';
import type { ConnectionEvent } from '@/types';

interface UseDatabaseReturn {
    connections: DatabaseConnection[];
    activeConnection: DatabaseConnection | null;
    isConnecting: boolean;
    error: string | null;
    connect: (path: string) => Promise<void>;
    disconnect: (connectionId: string) => Promise<void>;
    setActive: (connectionId: string) => void;
    refresh: () => Promise<void>;
}

export function useDatabase(): UseDatabaseReturn {
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeConnection = connections.find(c => c.id === activeConnectionId) || null;

    const refresh = useCallback(async () => {
        try {
            const list = await dbService.listConnections();
            setConnections(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get database list');
        }
    }, []);

    const connect = useCallback(async (path: string) => {
        setIsConnecting(true);
        setError(null);

        try {
            const connection = await dbService.connect(path);
            setConnections(prev => [...prev, connection]);
            setActiveConnectionId(connection.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect');
            throw err;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(async (connectionId: string) => {
        try {
            await dbService.disconnect(connectionId);
            setConnections(prev => (prev as any[]).filter(c => c.id !== connectionId));
            if (activeConnectionId === connectionId) {
                setActiveConnectionId(connections[0]?.id || null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect');
            throw err;
        }
    }, [activeConnectionId, connections]);

    const setActive = useCallback((connectionId: string) => {
        setActiveConnectionId(connectionId);
    }, []);

    // Listen for connection events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        onConnectionChange((event: ConnectionEvent) => {
            if (event.type === 'disconnected') {
                setConnections(prev =>
                    prev.map(c =>
                        c.path === event.databasePath
                            ? { ...c, isConnected: false }
                            : c
                    )
                );
            } else if (event.type === 'error') {
                setError(event.error || 'Connection error');
            }
        }).then(fn => { unlisten = fn; });

        return () => { unlisten?.(); };
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        connections,
        activeConnection,
        isConnecting,
        error,
        connect,
        disconnect,
        setActive,
        refresh,
    };
}

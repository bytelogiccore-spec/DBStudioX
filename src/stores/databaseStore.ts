import { create } from 'zustand';
import { dbService } from '@/services/dbService';
import { DatabaseConnection } from '@/schemas/database';

interface DatabaseState {
    connections: DatabaseConnection[];
    activeConnection: DatabaseConnection | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchConnections: () => Promise<void>;
    connect: (path: string) => Promise<void>;
    disconnect: (connectionId: string) => Promise<void>;
    setActiveConnection: (connection: DatabaseConnection | null) => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
    connections: [],
    activeConnection: null,
    isLoading: false,
    error: null,

    fetchConnections: async () => {
        set({ isLoading: true, error: null });
        try {
            const connections = await dbService.listConnections();
            set({ connections, isLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
        }
    },

    connect: async (path: string) => {
        set({ isLoading: true, error: null });
        try {
            const newConnection = await dbService.connect(path);
            set((state) => ({
                connections: [...state.connections, newConnection],
                activeConnection: newConnection,
                isLoading: false
            }));
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
            throw err;
        }
    },

    disconnect: async (connectionId: string) => {
        set({ isLoading: true, error: null });
        try {
            await dbService.disconnect(connectionId);
            const { activeConnection, connections } = get();

            set({
                connections: connections.filter(c => c.id !== connectionId),
                activeConnection: activeConnection?.id === connectionId ? null : activeConnection,
                isLoading: false
            });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
        }
    },

    setActiveConnection: (connection) => {
        set({ activeConnection: connection });
    }
}));

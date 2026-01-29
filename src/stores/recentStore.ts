import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RecentConnection {
    id: string;
    name: string;
    path: string;
    lastOpened: string; // ISO date string
}

interface RecentStoreState {
    connections: RecentConnection[];

    // Actions
    addConnection: (connection: Omit<RecentConnection, 'id' | 'lastOpened'>) => void;
    removeConnection: (id: string) => void;
    clearConnections: () => void;
}

export const useRecentStore = create<RecentStoreState>()(
    persist(
        (set) => ({
            connections: [],

            addConnection: (connection) => {
                set((state) => {
                    const now = new Date().toISOString();
                    // Remove existing connection with same path if it exists
                    const filtered = state.connections.filter((c) => c.path !== connection.path);

                    const newConnection: RecentConnection = {
                        ...connection,
                        id: Math.random().toString(36).substring(7),
                        lastOpened: now,
                    };

                    // Add to top and limit to 10
                    return {
                        connections: [newConnection, ...filtered].slice(0, 10)
                    };
                });
            },

            removeConnection: (id) => {
                set((state) => ({
                    connections: state.connections.filter((c) => c.id !== id)
                }));
            },

            clearConnections: () => {
                set({ connections: [] });
            },
        }),
        {
            name: 'dbstudiox-recent-connections',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

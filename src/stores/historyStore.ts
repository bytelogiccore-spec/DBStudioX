import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface HistoryItem {
    id: string;
    sql: string;
    executedAt: string;
    durationMs: number;
    connectionId: string;
    status: 'success' | 'error';
    errorMessage?: string;
}

interface HistoryState {
    items: HistoryItem[];

    // Actions
    addHistory: (item: Omit<HistoryItem, 'id'>) => void;
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
    persist(
        (set) => ({
            items: [],

            addHistory: (item) => {
                const id = Math.random().toString(36).substring(7);
                set((state) => ({
                    items: [{ ...item, id }, ...state.items].slice(0, 200) // Keep last 200
                }));
            },

            clearHistory: () => set({ items: [] }),

            removeFromHistory: (id) => set((state) => ({
                items: state.items.filter(item => item.id !== id)
            })),
        }),
        {
            name: 'dbstudiox-history',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

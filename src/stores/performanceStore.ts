import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';

export interface PerformanceMetrics {
    cacheHitRate: number;
    queryCount: number;
    avgQueryTimeMs: number;
    connectionCount: number;
    memoryUsageBytes: number;
    walCheckpointCount: number;
}

export interface PerformanceEvent {
    timestamp: string;
    metrics: PerformanceMetrics;
}

interface PerformanceState {
    history: PerformanceEvent[];
    currentMetrics: PerformanceMetrics | null;
    isMonitoring: boolean;

    // Actions
    startMonitoring: () => Promise<void>;
    addEvent: (event: PerformanceEvent) => void;
    clearHistory: () => void;
}

const MAX_HISTORY_LENGTH = 50;

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
    history: [],
    currentMetrics: null,
    isMonitoring: false,

    startMonitoring: async () => {
        if (get().isMonitoring) return;

        set({ isMonitoring: true });

        // Listen to the backend event 'db:perf_update'
        await listen<PerformanceEvent>('db:perf_update', (event) => {
            get().addEvent(event.payload);
        });

        // We keep it monitoring once started for the session
        return;
    },

    addEvent: (event) => {
        set((state) => {
            const newHistory = [...state.history, event].slice(-MAX_HISTORY_LENGTH);
            return {
                history: newHistory,
                currentMetrics: event.metrics
            };
        });
    },

    clearHistory: () => set({ history: [], currentMetrics: null }),
}));

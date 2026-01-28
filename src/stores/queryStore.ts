import { create } from 'zustand';
import { dbService } from '@/services/dbService';
import { fileService } from '@/services/fileService';
import { QueryResult } from '@/schemas/query';
import { useDatabaseStore } from './databaseStore';
import { useHistoryStore } from './historyStore';

export interface QueryTab {
    id: string;
    title: string;
    content: string;
    result: QueryResult | null;
    error: string | null;
    isLoading: boolean;
    isPermanent?: boolean;
    executedAt?: string;
}

interface QueryState {
    tabs: QueryTab[];
    activeTabId: string | null;
    resultPanelExpanded: boolean;

    // Actions
    setActiveTab: (id: string) => void;
    addTab: (title?: string) => void;
    closeTab: (id: string) => void;
    closeAllTabs: () => void;
    closeOtherTabs: (id: string) => void;
    closeTabsToRight: (id: string) => void;
    renameTab: (id: string, title: string) => void;
    updateTabContent: (id: string, content: string) => void;
    executeCurrentTab: (connectionId: string) => Promise<void>;
    exportActiveResult: (format: 'csv' | 'json' | 'sql') => Promise<void>;
    toggleResultPanel: () => void;
    clearResult: () => void;
}

export const useQueryStore = create<QueryState>((set, get) => ({
    tabs: [
        {
            id: 'initial',
            title: 'Query 1',
            content: 'SELECT * FROM sqlite_master;',
            result: null,
            error: null,
            isLoading: false,
            isPermanent: true
        }
    ],
    activeTabId: 'initial',
    resultPanelExpanded: false,

    setActiveTab: (id: string) => set({ activeTabId: id }),

    addTab: (title = 'New Query') => {
        const id = `query_${Math.random().toString(36).substring(7)}`;
        set((state) => ({
            tabs: [...state.tabs, { id, title, content: '', result: null, error: null, isLoading: false }],
            activeTabId: id
        }));
    },

    closeTab: (id: string) => {
        set((state) => {
            const tab = state.tabs.find(t => t.id === id);
            if (tab?.isPermanent) return state;

            const newTabs = state.tabs.filter(t => t.id !== id);
            const newActiveId = state.activeTabId === id
                ? (newTabs[newTabs.length - 1]?.id || null)
                : state.activeTabId;

            return { tabs: newTabs, activeTabId: newActiveId };
        });
    },

    closeAllTabs: () => {
        set((state) => {
            // Keep only permanent tabs
            const permanentTabs = state.tabs.filter(t => t.isPermanent);
            const newActiveId = permanentTabs[0]?.id || null;
            return { tabs: permanentTabs.length > 0 ? permanentTabs : state.tabs.slice(0, 1), activeTabId: newActiveId };
        });
    },

    closeOtherTabs: (id: string) => {
        set((state) => {
            // Keep the specified tab and permanent tabs
            const newTabs = state.tabs.filter(t => t.id === id || t.isPermanent);
            return { tabs: newTabs, activeTabId: id };
        });
    },

    closeTabsToRight: (id: string) => {
        set((state) => {
            const idx = state.tabs.findIndex(t => t.id === id);
            if (idx === -1) return state;
            // Keep tabs up to and including the specified tab, plus permanent tabs after
            const newTabs = state.tabs.filter((t, i) => i <= idx || t.isPermanent);
            return { tabs: newTabs, activeTabId: state.activeTabId };
        });
    },

    renameTab: (id: string, title: string) => {
        set((state) => ({
            tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t)
        }));
    },

    updateTabContent: (id: string, content: string) => {
        set((state) => ({
            tabs: state.tabs.map(t => t.id === id ? { ...t, content } : t)
        }));
    },

    executeCurrentTab: async (connectionId: string) => {
        const { activeTabId, tabs } = get();
        const activeTab = tabs.find(t => t.id === activeTabId);
        const addHistory = useHistoryStore.getState().addHistory;

        if (!activeTab || !activeTab.content) return;

        // Clear previous result/error and set loading
        set((state) => ({
            tabs: state.tabs.map(t => t.id === activeTabId
                ? { ...t, isLoading: true, result: null, error: null }
                : t
            )
        }));

        try {
            const result = await dbService.executeQuery(connectionId, activeTab.content, []);

            // Add to persistent history
            addHistory({
                sql: activeTab.content,
                executedAt: new Date().toISOString(),
                durationMs: result.executionTimeMs,
                connectionId,
                status: 'success'
            });

            set((state) => ({
                tabs: state.tabs.map(t => t.id === activeTabId
                    ? { ...t, result, error: null, isLoading: false, executedAt: new Date().toISOString() }
                    : t
                ),
                resultPanelExpanded: result.rows && result.rows.length > 0
            }));
        } catch (err) {
            const errorMessage = String(err);

            // Add failed query to history
            addHistory({
                sql: activeTab.content,
                executedAt: new Date().toISOString(),
                durationMs: 0,
                connectionId,
                status: 'error',
                errorMessage
            });

            set((state) => ({
                tabs: state.tabs.map(t => t.id === activeTabId
                    ? { ...t, isLoading: false, result: null, error: errorMessage, executedAt: new Date().toISOString() }
                    : t
                ),
                resultPanelExpanded: false
            }));
        }
    },

    exportActiveResult: async (format: 'csv' | 'json' | 'sql') => {
        const { activeTabId, tabs } = get();
        const activeTab = tabs.find(t => t.id === activeTabId);

        if (!activeTab || !activeTab.result) {
            throw new Error('No active result to export');
        }

        const defaultName = `export_${new Date().getTime()}.${format}`;
        const outputPath = await fileService.saveFileDialog(defaultName);

        if (outputPath) {
            await fileService.exportResult(activeTab.result, format, outputPath);
        }
    },

    toggleResultPanel: () => set((state) => ({ resultPanelExpanded: !state.resultPanelExpanded })),

    clearResult: () => {
        const { activeTabId } = get();
        set((state) => ({
            tabs: state.tabs.map(t => t.id === activeTabId
                ? { ...t, result: null, error: null }
                : t
            ),
            resultPanelExpanded: false
        }));
    }
}));

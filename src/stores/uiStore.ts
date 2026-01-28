import { create } from 'zustand';

export type MainView = 'editor' | 'dashboard' | 'history' | 'about' | 'settings' | 'savedScripts' | 'auditLogs' | 'connection' | 'udfManagement' | 'partitionManagement' | 'erDiagram';

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

interface UIState {
    activeView: MainView;
    isSidebarOpen: boolean;
    sidebarCollapsed: boolean;
    showConnectionDialog: boolean;
    settingsPanelOpen: boolean;
    activeModal: string | null;
    modalData: any; // Data for the active modal

    // Search
    searchOpen: boolean;
    searchQuery: string;

    // Notifications
    notifications: Notification[];
    notificationPanelOpen: boolean;

    // Schema sync
    schemaVersion: number;

    // Actions
    setActiveView: (view: MainView) => void;
    toggleSidebar: () => void;
    toggleSidebarCollapse: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    openConnectionDialog: () => void;
    closeConnectionDialog: () => void;
    openSettingsPanel: () => void;
    closeSettingsPanel: () => void;
    toggleSettingsPanel: () => void;
    openModal: (modalId: string, data?: any) => void;
    closeModal: () => void;

    // Search actions
    toggleSearch: () => void;
    closeSearch: () => void;
    setSearchQuery: (query: string) => void;

    // Notification actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    clearNotifications: () => void;
    toggleNotificationPanel: () => void;
    closeNotificationPanel: () => void;

    // Schema sync
    triggerSchemaRefresh: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeView: 'editor',
    isSidebarOpen: true,
    sidebarCollapsed: false,
    showConnectionDialog: false,
    settingsPanelOpen: false,
    activeModal: null,
    modalData: null,

    // Search
    searchOpen: false,
    searchQuery: '',

    // Notifications
    notifications: [],
    notificationPanelOpen: false,

    // Schema sync
    schemaVersion: 0,

    // View actions
    setActiveView: (view) => set({ activeView: view }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    openConnectionDialog: () => set({ showConnectionDialog: true }),
    closeConnectionDialog: () => set({ showConnectionDialog: false }),
    openSettingsPanel: () => set({ settingsPanelOpen: true }),
    closeSettingsPanel: () => set({ settingsPanelOpen: false }),
    toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),
    openModal: (modalId, data) => set({ activeModal: modalId, modalData: data || null }),
    closeModal: () => set({ activeModal: null, modalData: null }),

    // Search actions
    toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen, searchQuery: state.searchOpen ? '' : state.searchQuery })),
    closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Notification actions
    addNotification: (notification) => set((state) => ({
        notifications: [
            {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                read: false,
            },
            ...state.notifications,
        ].slice(0, 50), // Keep max 50 notifications
    })),
    markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ),
    })),
    markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
    })),
    clearNotifications: () => set({ notifications: [] }),
    toggleNotificationPanel: () => set((state) => ({ notificationPanelOpen: !state.notificationPanelOpen })),
    closeNotificationPanel: () => set({ notificationPanelOpen: false }),

    // Schema sync
    triggerSchemaRefresh: () => set((state) => ({ schemaVersion: state.schemaVersion + 1 })),
}));

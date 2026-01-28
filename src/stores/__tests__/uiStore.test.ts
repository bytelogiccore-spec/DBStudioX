import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset state before each test
        useUIStore.setState({ activeView: 'editor', isSidebarOpen: true });
    });

    it('should have initial state', () => {
        const state = useUIStore.getState();
        expect(state.activeView).toBe('editor');
        expect(state.isSidebarOpen).toBe(true);
    });

    it('should change active view', () => {
        const { setActiveView } = useUIStore.getState();
        setActiveView('dashboard');
        expect(useUIStore.getState().activeView).toBe('dashboard');
    });

    it('should toggle sidebar', () => {
        const { toggleSidebar } = useUIStore.getState();
        toggleSidebar();
        expect(useUIStore.getState().isSidebarOpen).toBe(false);
        toggleSidebar();
        expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });
});

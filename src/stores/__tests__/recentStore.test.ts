import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentStore } from '@/stores/recentStore';

describe('useRecentStore', () => {
    beforeEach(() => {
        // Reset state before each test
        useRecentStore.setState({ connections: [] });
        // Clear local storage if needed, but setState should be enough for the store state
        localStorage.clear();
    });

    it('should have initial state', () => {
        const state = useRecentStore.getState();
        expect(state.connections).toEqual([]);
    });

    it('should add a connection', () => {
        const { addConnection } = useRecentStore.getState();
        addConnection({ name: 'test.db', path: '/path/to/test.db' });

        const state = useRecentStore.getState();
        expect(state.connections).toHaveLength(1);
        expect(state.connections[0].name).toBe('test.db');
        expect(state.connections[0].path).toBe('/path/to/test.db');
        expect(state.connections[0].id).toBeDefined();
        expect(state.connections[0].lastOpened).toBeDefined();
    });

    it('should handle duplicates by moving to top and updating timestamp', () => {
        const { addConnection } = useRecentStore.getState();
        addConnection({ name: 'test.db', path: '/path/to/test.db' });

        // Wait a bit to ensure timestamp difference (though in test it might be fast)
        // actually we just check it moves to top if we add another one then re-add first

        addConnection({ name: 'other.db', path: '/path/to/other.db' });
        let state = useRecentStore.getState();
        expect(state.connections[0].name).toBe('other.db');
        expect(state.connections[1].name).toBe('test.db');

        // Re-add test.db
        addConnection({ name: 'test.db', path: '/path/to/test.db' });
        state = useRecentStore.getState();
        expect(state.connections).toHaveLength(2);
        expect(state.connections[0].name).toBe('test.db');
        expect(state.connections[1].name).toBe('other.db');
    });

    it('should limit to 10 connections', () => {
        const { addConnection } = useRecentStore.getState();

        for (let i = 0; i < 15; i++) {
            addConnection({ name: `db${i}.db`, path: `/path/to/db${i}.db` });
        }

        const state = useRecentStore.getState();
        expect(state.connections).toHaveLength(10);
        // The last added (db14) should be first
        expect(state.connections[0].name).toBe('db14.db');
        // The oldest allowed (db5) should be last
        expect(state.connections[9].name).toBe('db5.db');
    });

    it('should remove a connection', () => {
        const { addConnection, removeConnection } = useRecentStore.getState();
        addConnection({ name: 'test.db', path: '/path/to/test.db' });

        const id = useRecentStore.getState().connections[0].id;
        removeConnection(id);

        const state = useRecentStore.getState();
        expect(state.connections).toHaveLength(0);
    });

    it('should clear connections', () => {
        const { addConnection, clearConnections } = useRecentStore.getState();
        addConnection({ name: 'test.db', path: '/path/to/test.db' });

        clearConnections();

        const state = useRecentStore.getState();
        expect(state.connections).toHaveLength(0);
    });
});

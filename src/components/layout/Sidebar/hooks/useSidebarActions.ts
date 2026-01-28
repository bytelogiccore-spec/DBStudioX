'use client';

import { useState, useCallback } from 'react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useUIStore } from '@/stores/uiStore';
import { useQueryStore } from '@/stores/queryStore';
import { executeQuery, SchemaInfo } from '@/lib/tauri';

export const useSidebarActions = (schema: SchemaInfo | null, refreshSchema: () => void) => {
    const { activeConnection } = useDatabaseStore();
    const { setActiveView, triggerSchemaRefresh } = useUIStore();
    const { addTab, updateTabContent } = useQueryStore();

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [modalType, setModalType] = useState<'table' | 'view' | 'index' | 'trigger'>('table');
    const [editItem, setEditItem] = useState<any>(null);
    const [parentTable, setParentTable] = useState<string | null>(null);

    const handleTableClick = useCallback((tableName: string) => {
        const sql = `SELECT * FROM ${tableName} LIMIT 1000;`;
        addTab(tableName);
        const { activeTabId } = useQueryStore.getState();
        if (activeTabId) {
            updateTabContent(activeTabId, sql);
            setActiveView('editor');
        }
    }, [addTab, updateTabContent, setActiveView]);

    const openCreateModal = useCallback((type: 'table' | 'view' | 'index' | 'trigger', parent?: string) => {
        setModalType(type);
        setModalMode('create');
        setEditItem(null);
        setParentTable(parent || null);
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback(async (type: 'table' | 'view' | 'index' | 'trigger', itemName: string) => {
        if (!activeConnection) return;

        let item: any = null;

        if (type === 'table') {
            try {
                const tableInfo = await import('@/lib/tauri').then(m => m.getTableInfo(activeConnection.id, itemName));
                item = tableInfo;
            } catch (e) {
                console.error('Failed to get table info:', e);
                item = schema?.tables.find(t => t.name === itemName);
            }
        } else if (type === 'view') {
            item = schema?.views.find(v => v.name === itemName);
        } else if (type === 'index') {
            const idx = schema?.indexes.find(i => i.name === itemName);
            if (idx) {
                try {
                    const result = await import('@/lib/tauri').then(m => m.executeQuery(activeConnection.id, `PRAGMA index_info("${itemName}")`, []));
                    const columns = result.rows.map((row: any[]) => row[2]);
                    item = { ...idx, columns };
                } catch (e) {
                    item = idx;
                }
            }
        } else if (type === 'trigger') {
            item = schema?.triggers.find(t => t.name === itemName);
        }

        setModalType(type);
        setModalMode('edit');
        setEditItem(item);
        setParentTable(null);
        setModalOpen(true);
    }, [activeConnection, schema]);

    const generateSelectSQL = useCallback(async (tableName: string) => {
        if (!activeConnection) return;
        try {
            const tableInfo = await import('@/lib/tauri').then(m => m.getTableInfo(activeConnection.id, tableName)) as any;
            const columns = tableInfo?.columns?.map((c: any) => c.name).join(', ') || '*';
            const sql = `SELECT ${columns}\nFROM "${tableName}"\nWHERE 1=1\nLIMIT 100;`;
            addTab(`SELECT ${tableName}`);
            const { activeTabId } = useQueryStore.getState();
            if (activeTabId) {
                updateTabContent(activeTabId, sql);
                setActiveView('editor');
            }
        } catch (e) {
            console.error(e);
        }
    }, [activeConnection, addTab, updateTabContent, setActiveView]);

    const generateInsertSQL = useCallback(async (tableName: string) => {
        if (!activeConnection) return;
        try {
            const tableInfo = await import('@/lib/tauri').then(m => m.getTableInfo(activeConnection.id, tableName)) as any;
            const columns = tableInfo?.columns || [];
            const colNames = columns.map((c: any) => c.name).join(', ');
            const placeholders = columns.map((c: any) => `'${c.name}_value'`).join(', ');
            const sql = `INSERT INTO "${tableName}" (${colNames})\nVALUES (${placeholders});`;
            addTab(`INSERT ${tableName}`);
            const { activeTabId } = useQueryStore.getState();
            if (activeTabId) {
                updateTabContent(activeTabId, sql);
                setActiveView('editor');
            }
        } catch (e) {
            console.error(e);
        }
    }, [activeConnection, addTab, updateTabContent, setActiveView]);

    const generateUpdateSQL = useCallback(async (tableName: string) => {
        if (!activeConnection) return;
        try {
            const tableInfo = await import('@/lib/tauri').then(m => m.getTableInfo(activeConnection.id, tableName)) as any;
            const columns = tableInfo?.columns || [];
            const pkCol = columns.find((c: any) => c.primaryKey)?.name || columns[0]?.name || 'id';
            const setClauses = columns.filter((c: any) => !c.primaryKey).map((c: any) => `    ${c.name} = '${c.name}_value'`).join(',\n');
            const sql = `UPDATE "${tableName}"\nSET\n${setClauses}\nWHERE ${pkCol} = ?;`;
            addTab(`UPDATE ${tableName}`);
            const { activeTabId } = useQueryStore.getState();
            if (activeTabId) {
                updateTabContent(activeTabId, sql);
                setActiveView('editor');
            }
        } catch (e) {
            console.error(e);
        }
    }, [activeConnection, addTab, updateTabContent, setActiveView]);

    const generateDeleteSQL = useCallback(async (tableName: string) => {
        if (!activeConnection) return;
        try {
            const tableInfo = await import('@/lib/tauri').then(m => m.getTableInfo(activeConnection.id, tableName)) as any;
            const columns = tableInfo?.columns || [];
            const pkCol = columns.find((c: any) => c.primaryKey)?.name || columns[0]?.name || 'id';
            const sql = `DELETE FROM "${tableName}"\nWHERE ${pkCol} = ?;`;
            addTab(`DELETE ${tableName}`);
            const { activeTabId } = useQueryStore.getState();
            if (activeTabId) {
                updateTabContent(activeTabId, sql);
                setActiveView('editor');
            }
        } catch (e) {
            console.error(e);
        }
    }, [activeConnection, addTab, updateTabContent, setActiveView]);

    const handleDropTable = useCallback(async (tableName: string) => {
        if (!activeConnection || !schema) return;

        const relatedIndexes = schema.indexes.filter(idx => idx.tableName === tableName);
        const relatedTriggers = schema.triggers.filter(trg => trg.tableName === tableName);
        const relatedViews = schema.views.filter(v =>
            v.sql?.toLowerCase().includes(`from ${tableName.toLowerCase()}`) ||
            v.sql?.toLowerCase().includes(`"${tableName.toLowerCase()}"`)
        );

        let warningMessage = `Are you sure you want to drop table "${tableName}"?\n\n`;
        if (relatedIndexes.length > 0 || relatedTriggers.length > 0 || relatedViews.length > 0) {
            warningMessage += `⚠️ This will also affect:\n\n`;
            if (relatedIndexes.length > 0) {
                warningMessage += `📋 Indexes (${relatedIndexes.length}):\n`;
                relatedIndexes.forEach(idx => { warningMessage += `   • ${idx.name}\n`; });
                warningMessage += `\n`;
            }
            if (relatedTriggers.length > 0) {
                warningMessage += `⚡ Triggers (${relatedTriggers.length}):\n`;
                relatedTriggers.forEach(trg => { warningMessage += `   • ${trg.name}\n`; });
                warningMessage += `\n`;
            }
            if (relatedViews.length > 0) {
                warningMessage += `👁️ Views that may be affected (${relatedViews.length}):\n`;
                relatedViews.forEach(v => { warningMessage += `   • ${v.name}\n`; });
                warningMessage += `\n`;
            }
        }
        warningMessage += `This action cannot be undone.`;

        if (!confirm(warningMessage)) return;

        try {
            await executeQuery(activeConnection.id, `DROP TABLE "${tableName}"`, []);
            refreshSchema();
            triggerSchemaRefresh();
        } catch (e) {
            console.error('Failed to drop table:', e);
            alert(`Failed to drop table: ${e}`);
        }
    }, [activeConnection, schema, refreshSchema, triggerSchemaRefresh]);

    const handleDropView = useCallback(async (viewName: string) => {
        if (!activeConnection || !schema) return;

        const dependentViews = schema.views.filter(v =>
            v.name !== viewName && (
                v.sql?.toLowerCase().includes(`from ${viewName.toLowerCase()}`) ||
                v.sql?.toLowerCase().includes(`"${viewName.toLowerCase()}"`)
            )
        );

        let warningMessage = `Are you sure you want to drop view "${viewName}"?\n\n`;
        if (dependentViews.length > 0) {
            warningMessage += `⚠️ Views that may depend on this view:\n`;
            dependentViews.forEach(v => { warningMessage += `   • ${v.name}\n`; });
            warningMessage += `\n`;
        }
        warningMessage += `This action cannot be undone.`;

        if (!confirm(warningMessage)) return;

        try {
            await executeQuery(activeConnection.id, `DROP VIEW "${viewName}"`, []);
            refreshSchema();
            triggerSchemaRefresh();
        } catch (e) {
            console.error('Failed to drop view:', e);
            alert(`Failed to drop view: ${e}`);
        }
    }, [activeConnection, schema, refreshSchema, triggerSchemaRefresh]);

    const handleDropIndex = useCallback(async (indexName: string) => {
        if (!activeConnection || !schema) return;

        const index = schema.indexes.find(idx => idx.name === indexName);
        const tableName = index?.tableName || 'unknown table';
        const warningMessage = `Are you sure you want to drop index "${indexName}"?\n\n` +
            `📋 This index belongs to table: ${tableName}\n\n` +
            `Note: Dropping this index may affect query performance.`;

        if (!confirm(warningMessage)) return;

        try {
            await executeQuery(activeConnection.id, `DROP INDEX "${indexName}"`, []);
            refreshSchema();
            triggerSchemaRefresh();
        } catch (e) {
            console.error('Failed to drop index:', e);
            alert(`Failed to drop index: ${e}`);
        }
    }, [activeConnection, schema, refreshSchema, triggerSchemaRefresh]);

    const handleDropTrigger = useCallback(async (triggerName: string) => {
        if (!activeConnection || !schema) return;

        const trigger = schema.triggers.find(trg => trg.name === triggerName);
        const tableName = trigger?.tableName || 'unknown table';
        const warningMessage = `Are you sure you want to drop trigger "${triggerName}"?\n\n` +
            `⚡ This trigger is attached to table: ${tableName}\n\n` +
            `Note: Dropping this trigger will stop its automatic execution on ${tableName}.`;

        if (!confirm(warningMessage)) return;

        try {
            await executeQuery(activeConnection.id, `DROP TRIGGER "${triggerName}"`, []);
            refreshSchema();
            triggerSchemaRefresh();
        } catch (e) {
            console.error('Failed to drop trigger:', e);
            alert(`Failed to drop trigger: ${e}`);
        }
    }, [activeConnection, schema, refreshSchema, triggerSchemaRefresh]);

    const handleModalClose = useCallback(() => {
        setModalOpen(false);
        setEditItem(null);
        setParentTable(null);
    }, []);

    const handleModalSave = useCallback(() => {
        handleModalClose();
        setTimeout(() => {
            refreshSchema();
            triggerSchemaRefresh();
        }, 100);
    }, [handleModalClose, refreshSchema, triggerSchemaRefresh]);

    return {
        handleTableClick,
        openCreateModal,
        openEditModal,
        generateSelectSQL,
        generateInsertSQL,
        generateUpdateSQL,
        generateDeleteSQL,
        handleDropTable,
        handleDropView,
        handleDropIndex,
        handleDropTrigger,
        handleModalClose,
        handleModalSave,
        modalState: {
            isOpen: modalOpen,
            mode: modalMode,
            type: modalType,
            editItem,
            parentTable,
        }
    };
};

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useUIStore } from '@/stores/uiStore';
import { dbService } from '@/services/dbService';
import { SchemaInfo } from '@/schemas/query';
import { Database, Layout, ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import SchemaModal from '@/components/modals/SchemaModal';
import ContextMenu from '@/components/ui/ContextMenu';

// Sub-components
import ExplorerSection from './Sidebar/components/ExplorerSection';
import NavigationSection from './Sidebar/components/NavigationSection';
import SidebarFooter from './Sidebar/components/SidebarFooter';

// Hooks
import { useSidebarActions } from './Sidebar/hooks/useSidebarActions';

import styles from './Sidebar.module.css';

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    type: 'table' | 'view' | 'index' | 'trigger' | 'tables' | 'views' | null;
    itemName: string | null;
    parentTable?: string;
}

const Sidebar: React.FC = () => {
    const { t } = useTranslation();
    const { activeConnection } = useDatabaseStore();
    const {
        activeView,
        setActiveView,
        sidebarCollapsed,
        toggleSidebarCollapse,
        setSidebarCollapsed,
        schemaVersion,
        openModal
    } = useUIStore();

    const [schema, setSchema] = useState<SchemaInfo | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        type: null,
        itemName: null,
    });

    const refreshSchema = useCallback(() => {
        if (activeConnection) {
            dbService.getSchema(activeConnection.id)
                .then(setSchema)
                .catch(console.error);
        } else {
            setSchema(null);
        }
    }, [activeConnection]);

    const {
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
        modalState
    } = useSidebarActions(schema, refreshSchema);

    useEffect(() => {
        refreshSchema();
    }, [refreshSchema, schemaVersion]);

    // Context Menu Handlers
    const handleContextMenu = (
        e: React.MouseEvent,
        type: ContextMenuState['type'],
        itemName: string | null = null,
        parentTableName?: string
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            type,
            itemName,
            parentTable: parentTableName,
        });
    };

    const closeContextMenu = () => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    };

    // Get context menu items based on type
    const getContextMenuItems = () => {
        const { type, itemName } = contextMenu;

        if (type === 'tables') {
            return [
                { label: 'Create Table...', icon: 'add', onClick: () => { openCreateModal('table'); closeContextMenu(); } },
            ];
        }

        if (type === 'views') {
            return [
                { label: 'Create View...', icon: 'add', onClick: () => { openCreateModal('view'); closeContextMenu(); } },
            ];
        }

        if (type === 'table' && itemName) {
            return [
                { label: 'View Data', icon: 'table_rows', onClick: () => { handleTableClick(itemName); closeContextMenu(); } },
                { type: 'separator' as const },
                { label: 'Copy Table...', icon: 'content_copy', onClick: () => { openModal('copyTable', { sourceTable: itemName }); closeContextMenu(); } },
                { type: 'separator' as const },
                { label: 'Generate SELECT', icon: 'query_stats', onClick: () => { generateSelectSQL(itemName); closeContextMenu(); } },
                { label: 'Generate INSERT', icon: 'add_circle', onClick: () => { generateInsertSQL(itemName); closeContextMenu(); } },
                { label: 'Generate UPDATE', icon: 'edit_note', onClick: () => { generateUpdateSQL(itemName); closeContextMenu(); } },
                { label: 'Generate DELETE', icon: 'delete_sweep', onClick: () => { generateDeleteSQL(itemName); closeContextMenu(); } },
                { type: 'separator' as const },
                { label: 'Create Index...', icon: 'add', onClick: () => { openCreateModal('index', itemName); closeContextMenu(); } },
                { label: 'Create Trigger...', icon: 'add', onClick: () => { openCreateModal('trigger', itemName); closeContextMenu(); } },
                { type: 'separator' as const },
                { label: 'Edit Table...', icon: 'edit', onClick: () => { openEditModal('table', itemName); closeContextMenu(); } },
                { label: 'Drop Table', icon: 'delete', danger: true, onClick: () => { handleDropTable(itemName); closeContextMenu(); } },
            ];
        }

        if (type === 'view' && itemName) {
            return [
                { label: 'View Data', icon: 'table_rows', onClick: () => { handleTableClick(itemName); closeContextMenu(); } },
                { type: 'separator' as const },
                { label: 'Edit View...', icon: 'edit', onClick: () => { openEditModal('view', itemName); closeContextMenu(); } },
                { label: 'Drop View', icon: 'delete', danger: true, onClick: () => { handleDropView(itemName); closeContextMenu(); } },
            ];
        }

        if (type === 'index' && itemName) {
            return [
                { label: 'Edit Index...', icon: 'edit', onClick: () => { openEditModal('index', itemName); closeContextMenu(); } },
                { label: 'Drop Index', icon: 'delete', danger: true, onClick: () => { handleDropIndex(itemName); closeContextMenu(); } },
            ];
        }

        if (type === 'trigger' && itemName) {
            return [
                { label: 'Edit Trigger...', icon: 'edit', onClick: () => { openEditModal('trigger', itemName); closeContextMenu(); } },
                { label: 'Drop Trigger', icon: 'delete', danger: true, onClick: () => { handleDropTrigger(itemName); closeContextMenu(); } },
            ];
        }

        return [];
    };

    const handleCollapsedItemClick = () => setSidebarCollapsed(false);

    const getTableIndexes = (tableName: string) => schema?.indexes.filter(idx => idx.tableName === tableName) || [];
    const getTableTriggers = (tableName: string) => schema?.triggers.filter(trg => trg.tableName === tableName) || [];

    return (
        <>
            <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <button
                        className={styles.logoButton}
                        onClick={toggleSidebarCollapse}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <div className={styles.logoIcon}>
                            <Database size={20} color="var(--brand-primary)" />
                        </div>
                        {!sidebarCollapsed && <span className={styles.logoText}>DBStudioX</span>}
                        {!sidebarCollapsed && (
                            <div className={styles.collapseHint}>
                                <ChevronLeft size={16} />
                            </div>
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className={styles.nav}>
                    <ExplorerSection
                        t={t}
                        schema={schema}
                        sidebarCollapsed={sidebarCollapsed}
                        handleCollapsedItemClick={handleCollapsedItemClick}
                        handleContextMenu={handleContextMenu}
                        handleTableClick={handleTableClick}
                        getTableIndexes={getTableIndexes}
                        getTableTriggers={getTableTriggers}
                    />

                    <NavigationSection
                        t={t}
                        sidebarCollapsed={sidebarCollapsed}
                        activeView={activeView}
                        setActiveView={setActiveView}
                    />
                </nav>

                {/* Footer */}
                <SidebarFooter
                    activeConnection={activeConnection}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    sidebarCollapsed={sidebarCollapsed}
                />
            </aside>

            {/* Context Menu */}
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems()}
                    onClose={closeContextMenu}
                />
            )}

            {/* Schema Modal */}
            {modalState.isOpen && (
                <SchemaModal
                    type={modalState.type}
                    mode={modalState.mode}
                    item={modalState.editItem}
                    parentTable={modalState.parentTable}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                />
            )}
        </>
    );
};

export default Sidebar;

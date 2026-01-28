'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import ExplorerItem from './ExplorerItem';
import TableItem from './TableItem';
import ExplorerSubItem from './ExplorerSubItem';
import { SchemaInfo } from '@/schemas/query';
import { TableProperties, View as ViewIcon, Database } from 'lucide-react';
import styles from '../../Sidebar.module.css';

interface ExplorerSectionProps {
    t: any;
    schema: SchemaInfo | null;
    sidebarCollapsed: boolean;
    handleCollapsedItemClick: () => void;
    handleContextMenu: (e: React.MouseEvent, type: any, itemName?: string | null, parentTable?: string) => void;
    handleTableClick: (tableName: string) => void;
    getTableIndexes: (tableName: string) => any[];
    getTableTriggers: (tableName: string) => any[];
}

const ExplorerSection: React.FC<ExplorerSectionProps> = ({
    t,
    schema,
    sidebarCollapsed,
    handleCollapsedItemClick,
    handleContextMenu,
    handleTableClick,
    getTableIndexes,
    getTableTriggers
}) => {
    return (
        <div className={styles.section}>
            {!sidebarCollapsed && <h3 className={styles.sectionTitle}>{t('common.explorer')}</h3>}
            <div className={styles.itemList}>
                {/* Tables */}
                <ExplorerItem
                    icon={TableProperties}
                    label={t('common.tables')}
                    count={schema?.tables.length || 0}
                    collapsed={sidebarCollapsed}
                    onCollapsedClick={handleCollapsedItemClick}
                    onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'tables')}
                >
                    {schema?.tables.map(table => (
                        <TableItem
                            key={table.name}
                            name={table.name}
                            indexes={getTableIndexes(table.name)}
                            triggers={getTableTriggers(table.name)}
                            onClick={() => handleTableClick(table.name)}
                            onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'table', table.name)}
                            onIndexContextMenu={(e: React.MouseEvent, idxName: string) => handleContextMenu(e, 'index', idxName, table.name)}
                            onTriggerContextMenu={(e: React.MouseEvent, triggerName: string) => handleContextMenu(e, 'trigger', triggerName, table.name)}
                        />
                    ))}
                </ExplorerItem>

                {/* Views */}
                <ExplorerItem
                    icon={ViewIcon}
                    label={t('common.views')}
                    count={schema?.views.length || 0}
                    collapsed={sidebarCollapsed}
                    onCollapsedClick={handleCollapsedItemClick}
                    onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'views')}
                >
                    {schema?.views.map(view => (
                        <ExplorerSubItem
                            key={view.name}
                            label={view.name}
                            onClick={() => handleTableClick(view.name)}
                            onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'view', view.name)}
                        />
                    ))}
                </ExplorerItem>
            </div>
        </div>
    );
};

export default ExplorerSection;

import React from 'react';
import { MainView, useUIStore } from '@/stores/uiStore';
import NavItem from './NavItem';
import styles from '../../Sidebar.module.css';
import {
    History as LucideHistory, Star, Activity, ShieldEllipsis,
    FileJson, LayoutPanelLeft, Network, Code, Database, ShieldCheck, FileSearch
} from 'lucide-react';

interface NavigationSectionProps {
    t: any;
    sidebarCollapsed: boolean;
    activeView: MainView;
    setActiveView: (view: MainView) => void;
}

const NavigationSection: React.FC<NavigationSectionProps> = ({
    t,
    sidebarCollapsed,
    activeView,
    setActiveView
}) => {
    const { openModal } = useUIStore();

    return (
        <>
            {/* Favorites Section */}
            <div className={styles.section}>
                {!sidebarCollapsed && <h3 className={styles.sectionTitle}>{t('common.favorites')}</h3>}
                <div className={styles.itemList}>
                    <NavItem
                        icon={LucideHistory}
                        label="Recent Queries"
                        active={activeView === 'history'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('history')}
                    />
                    <NavItem
                        icon={Star}
                        label="Saved Scripts"
                        active={activeView === 'savedScripts'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('savedScripts')}
                    />
                </div>
            </div>

            {/* Monitoring Section */}
            <div className={styles.section}>
                {!sidebarCollapsed && <h3 className={styles.sectionTitle}>{t('common.monitoring')}</h3>}
                <div className={styles.itemList}>
                    <NavItem
                        icon={Activity}
                        label={t('common.performance')}
                        active={activeView === 'dashboard'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('dashboard')}
                    />
                    <NavItem
                        icon={ShieldEllipsis}
                        label="Audit Logs"
                        active={activeView === 'auditLogs'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('auditLogs')}
                    />
                    <NavItem
                        icon={FileJson}
                        label="UDF Management"
                        active={activeView === 'udfManagement'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('udfManagement')}
                    />
                    <NavItem
                        icon={LayoutPanelLeft}
                        label="Partition Mgmt"
                        active={activeView === 'partitionManagement'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('partitionManagement')}
                    />
                    <NavItem
                        icon={Network}
                        label="ER Diagram"
                        active={activeView === 'erDiagram'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('erDiagram')}
                    />
                </div>
            </div>

            {/* Tools Section */}
            <div className={styles.section}>
                {!sidebarCollapsed && <h3 className={styles.sectionTitle}>Tools</h3>}
                <div className={styles.itemList}>
                    <NavItem
                        icon={Code}
                        label="SQL Editor"
                        active={activeView === 'editor'}
                        collapsed={sidebarCollapsed}
                        onClick={() => setActiveView('editor')}
                    />
                    <NavItem
                        icon={Database}
                        label="Migration"
                        active={false}
                        collapsed={sidebarCollapsed}
                        onClick={() => openModal('migration-wizard')}
                    />
                    <NavItem
                        icon={ShieldCheck}
                        label="Backup & Restore"
                        active={false}
                        collapsed={sidebarCollapsed}
                        onClick={() => openModal('backup-restore')}
                    />
                    <NavItem
                        icon={FileSearch}
                        label="Schema Diff"
                        active={false}
                        collapsed={sidebarCollapsed}
                        onClick={() => openModal('schema-diff')}
                    />
                </div>
            </div>
        </>
    );
};

export default NavigationSection;

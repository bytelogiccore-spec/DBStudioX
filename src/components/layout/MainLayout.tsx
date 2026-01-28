'use client';

import React from 'react';
import TitleBar from '@/components/layout/TitleBar';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard';
import HistoryDashboard from '@/components/dashboard/HistoryDashboard';
import AboutDashboard from '@/components/dashboard/AboutDashboard';
import SavedScriptsDashboard from '@/components/dashboard/SavedScriptsDashboard';
import AuditLogsDashboard from '@/components/dashboard/AuditLogsDashboard';
import UdfManagementDashboard from '@/components/dashboard/UdfManagementDashboard';
import PartitionManagementDashboard from '@/components/dashboard/PartitionManagementDashboard';
import ErDiagramDashboard from '@/components/dashboard/ErDiagramDashboard';
import SettingsPanel from '@/components/ui/SettingsPanel';
import Toast from '@/components/ui/Toast';
import ConnectionDialog from '@/components/connection/ConnectionDialog';
import MigrationWizard from '@/components/features/migration/MigrationWizard';
import CopyTableModal from '@/components/features/migration/CopyTableModal';
import BackupRestoreModal from '@/components/features/database/BackupRestoreModal';
import SchemaDiffModal from '@/components/features/database/SchemaDiffModal';
import { useUIStore } from '@/stores/uiStore';
import { useDatabaseStore } from '@/stores/databaseStore';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { activeView, sidebarCollapsed, settingsPanelOpen, closeSettingsPanel } = useUIStore();
    const { activeConnection } = useDatabaseStore();

    const renderContent = () => {
        // Settings view
        if (activeView === 'settings') {
            return <SettingsPanel />;
        }

        switch (activeView) {
            case 'editor': return children;
            case 'dashboard': return <PerformanceDashboard />;
            case 'history': return <HistoryDashboard />;
            case 'about': return <AboutDashboard />;
            case 'savedScripts': return <SavedScriptsDashboard />;
            case 'auditLogs': return <AuditLogsDashboard />;
            case 'udfManagement': return <UdfManagementDashboard />;
            case 'partitionManagement': return <PartitionManagementDashboard />;
            case 'erDiagram': return <ErDiagramDashboard />;
            default: return children;
        }
    };

    // Show connection dialog if not connected
    if (!activeConnection) {
        return (
            <div className={styles.appContainer}>
                <TitleBar />
                <ConnectionDialog />
            </div>
        );
    }

    return (
        <div className={styles.appContainer}>
            {/* Custom Title Bar */}
            <TitleBar />

            <div className={`${styles.container} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
                {/* Aurora Glow Effects */}
                <div className={styles.glowPurple} />
                <div className={styles.glowCyan} />

                {/* Main Sidebar */}
                <Sidebar />

                {/* Content Area */}
                <div className={styles.contentArea}>
                    <Header />
                    <main className={styles.main}>
                        {renderContent()}
                    </main>
                    <StatusBar />
                </div>
            </div>

            {/* Toast Notifications */}
            <Toast />

            {/* Global Features */}
            <MigrationWizard />
            <CopyTableModal />
            <BackupRestoreModal />
            <SchemaDiffModal />
        </div>
    );
};

export default MainLayout;

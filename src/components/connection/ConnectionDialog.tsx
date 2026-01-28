'use client';

import React, { useState } from 'react';
import { Database, FolderOpen, Plus, X, HardDrive } from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { dbService } from '@/services/dbService';
import FileDialog from '@/components/ui/FileDialog';
import { useFileDialog, FILE_FILTERS } from '@/hooks/useFileDialog';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from './ConnectionDialog.module.css';

interface RecentConnection {
    id: string;
    name: string;
    path: string;
    lastOpened: Date;
}

const ConnectionDialog: React.FC = () => {
    const { setActiveConnection } = useDatabaseStore();
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom file dialog hook
    const fileDialog = useFileDialog();

    // TODO: Load from localStorage or a store
    const recentConnections: RecentConnection[] = [];

    const handleOpenFile = async () => {
        // Open custom file dialog
        const path = await fileDialog.openFile({
            filters: FILE_FILTERS.database,
            title: 'Open Database'
        });

        if (path) {
            await connectToDatabase(path);
        }
    };

    const handleCreateNew = async () => {
        // Open custom save dialog
        const path = await fileDialog.saveFile({
            filters: FILE_FILTERS.database,
            title: 'Create New Database',
            defaultFileName: 'new_database.db'
        });

        if (path) {
            await connectToDatabase(path);
        }
    };

    const connectToDatabase = async (path: string) => {
        setIsConnecting(true);
        setError(null);

        try {
            const fileName = path.split(/[/\\]/).pop() || 'Database';
            const result = await dbService.connect(path);

            if (result) {
                setActiveConnection({
                    id: result.id,
                    name: fileName,
                    path: path,
                    isConnected: true,
                    createdAt: new Date(),
                });
            }
        } catch (err: any) {
            console.error('Failed to open database:', err);
            setError(err.message || 'Failed to open database');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Aurora Background */}
            <div className={styles.glowPurple} />
            <div className={styles.glowCyan} />

            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <div className={styles.logoWrapper}>
                        <div className={styles.logoInner}>
                            <Database size={48} style={{ color: 'var(--brand-primary)' }} />
                        </div>
                    </div>
                    <h1 className={styles.title}>
                        DBStudio<span className={styles.titleAccent}>X</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Next-generation SQLite management workstation
                    </p>
                </div>

                {/* Connection Options */}
                <div className={styles.options}>
                    <Card
                        hoverable
                        disabled={isConnecting}
                        className={styles.optionCard}
                        onClick={handleOpenFile}
                    >
                        <div className={styles.optionIcon}>
                            <FolderOpen size={28} />
                        </div>
                        <div className={styles.optionText}>
                            <h3>Open Database</h3>
                            <p>Open an existing SQLite database file</p>
                        </div>
                    </Card>

                    <Card
                        hoverable
                        disabled={isConnecting}
                        className={styles.optionCard}
                        onClick={handleCreateNew}
                    >
                        <div className={styles.optionIconSecondary}>
                            <Plus size={28} />
                        </div>
                        <div className={styles.optionText}>
                            <h3>Create New</h3>
                            <p>Create a new SQLite database</p>
                        </div>
                    </Card>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={styles.error}>
                        <X size={14} />
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isConnecting && (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        Connecting...
                    </div>
                )}

                {/* Recent Connections */}
                {recentConnections.length > 0 && (
                    <div className={styles.recentSection}>
                        <h4 className={styles.recentTitle}>Recent Connections</h4>
                        <div className={styles.recentList}>
                            {recentConnections.map((conn) => (
                                <button key={conn.id} className={styles.recentItem}>
                                    <HardDrive size={16} />
                                    <div className={styles.recentInfo}>
                                        <span className={styles.recentName}>{conn.name}</span>
                                        <span className={styles.recentPath}>{conn.path}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <p>Version 0.1.0 Alpha • ByteLogic Studio</p>
                </div>
            </div>

            {/* Custom File Dialog */}
            <FileDialog
                open={fileDialog.isOpen}
                mode={fileDialog.mode}
                onSelect={fileDialog.onSelect}
                onClose={fileDialog.onClose}
                title={fileDialog.options.title}
                filters={fileDialog.options.filters}
                defaultFileName={fileDialog.options.defaultFileName}
            />
        </div>
    );
};

export default ConnectionDialog;

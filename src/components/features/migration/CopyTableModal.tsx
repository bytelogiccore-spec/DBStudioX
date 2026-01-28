import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useDatabaseStore } from '@/stores/databaseStore';
import { copyTable } from '@/lib/tauri';
import { X, Database, ArrowRight } from 'lucide-react';
import styles from './CopyTableModal.module.css';

const CopyTableModal = () => {
    const { activeModal, modalData, closeModal, addNotification } = useUIStore();
    const { connections, activeConnection } = useDatabaseStore();

    // State
    const [targetDbId, setTargetDbId] = useState<string>('');
    const [targetTable, setTargetTable] = useState<string>('');
    const [withData, setWithData] = useState<boolean>(true);
    const [loading, setLoading] = useState(false);

    // Initialize defaults when modal opens
    useEffect(() => {
        if (activeModal === 'copyTable' && modalData?.sourceTable) {
            setTargetTable(`${modalData.sourceTable}_copy`);
            // Default to active connection if exists, otherwise first available
            if (activeConnection) {
                setTargetDbId(activeConnection.id);
            } else if (connections.length > 0) {
                setTargetDbId(connections[0].id);
            }
        }
    }, [activeModal, modalData, activeConnection, connections]);

    if (activeModal !== 'copyTable') return null;

    const handleCopy = async () => {
        if (!targetDbId) {
            addNotification({ type: 'error', title: 'Error', message: 'Please select a target database.' });
            return;
        }
        if (!targetTable) {
            addNotification({ type: 'error', title: 'Error', message: 'Please enter a target table name.' });
            return;
        }

        // Check if copying to same table in same database
        if (targetDbId === activeConnection?.id && targetTable === modalData.sourceTable) {
            addNotification({
                type: 'error',
                title: 'Invalid Target',
                message: 'Target table name must be different when copying within the same database.'
            });
            return;
        }

        setLoading(true);
        try {
            const result = await copyTable(
                activeConnection?.id || targetDbId,
                modalData.sourceTable,
                targetDbId,
                targetTable,
                withData
            );

            if (result.success) {
                addNotification({ type: 'success', title: 'Success', message: result.message });
                closeModal();
                // Trigger global refresh to show new table if applicable
                useUIStore.getState().triggerSchemaRefresh();
            } else {
                addNotification({ type: 'error', title: 'Error', message: result.message });
            }
        } catch (e: any) {
            addNotification({ type: 'error', title: 'Copy Failed', message: e.toString() });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Copy Table: <span style={{ color: 'var(--brand-primary)' }}>{modalData?.sourceTable}</span></h2>
                    <button onClick={closeModal} className={styles.closeBtn}><X size={18} /></button>
                </div>

                <div className={styles.body}>
                    <div className={styles.formGroup}>
                        <label>Source Database</label>
                        <div className={styles.inputReadOnly}>
                            <Database size={14} />
                            {activeConnection?.name || 'Current Database'}
                        </div>
                    </div>

                    <div className={styles.arrowRow}>
                        <ArrowRight size={20} className={styles.arrow} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Target Database</label>
                        <select
                            value={targetDbId}
                            onChange={(e) => setTargetDbId(e.target.value)}
                            className={styles.select}
                        >
                            <option value="" disabled>Select target database</option>
                            {connections.map(conn => (
                                <option key={conn.id} value={conn.id}>{conn.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Target Table Name</label>
                        <input
                            type="text"
                            value={targetTable}
                            onChange={(e) => setTargetTable(e.target.value)}
                            className={styles.input}
                            placeholder="Enter new table name"
                        />
                    </div>

                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="withData"
                            checked={withData}
                            onChange={(e) => setWithData(e.target.checked)}
                        />
                        <label htmlFor="withData">Copy Data (Duplicate Rows)</label>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={closeModal} className={styles.cancelBtn} disabled={loading}>Cancel</button>
                    <button onClick={handleCopy} className={styles.confirmBtn} disabled={loading}>
                        {loading ? 'Copying...' : 'Copy Table'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CopyTableModal;

'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Calendar, Clock, Trash2, Plus, Activity, Play, Settings, X, Table } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './PartitionManagementDashboard.module.css';

interface TablePartitionInfo {
    baseTable: string;
    partitions: string[];
    totalRows: number;
}

interface PartitionPolicy {
    id: string;
    tableName: string;
    dateColumn: string;
    partitionInterval: string;
    retentionDays: number;
    createdAt: string;
}

interface MaintenanceResult {
    policiesProcessed: number;
    partitionsDeleted: number;
    rowsDeleted: number;
    details: string[];
}

interface CreatePolicyRequest {
    tableName: string;
    dateColumn: string;
    partitionInterval: string;
    retentionDays: number;
}

interface TableInfo {
    name: string;
    columns: { name: string; type: string }[];
}

interface SchemaInfo {
    tables: TableInfo[];
}

const PartitionManagementDashboard: React.FC = () => {
    const { activeConnection } = useDatabaseStore();
    const { addNotification } = useUIStore();
    const [partitions, setPartitions] = useState<TablePartitionInfo[]>([]);
    const [policies, setPolicies] = useState<PartitionPolicy[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [tableColumns, setTableColumns] = useState<{ name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [runningMaintenance, setRunningMaintenance] = useState(false);

    // Policy creation form
    const [selectedTable, setSelectedTable] = useState('');
    const [dateColumn, setDateColumn] = useState('');
    const [partitionInterval, setPartitionInterval] = useState<string>('monthly');
    const [retentionDays, setRetentionDays] = useState<number>(30);
    const [creating, setCreating] = useState(false);

    // Fetch columns when table is selected
    useEffect(() => {
        const fetchTableColumns = async () => {
            if (!activeConnection || !selectedTable) {
                setTableColumns([]);
                return;
            }
            try {
                const tableInfo = await invoke<{ columns: { name: string; type: string }[] }>(
                    'get_table_info',
                    { connectionId: activeConnection.id, tableName: selectedTable }
                );
                setTableColumns(tableInfo.columns || []);
            } catch (e) {
                console.error('Failed to fetch table columns:', e);
                setTableColumns([]);
            }
        };
        fetchTableColumns();
    }, [activeConnection, selectedTable]);

    // Get available table names
    const availableTables = tables.map((t: TableInfo) => t.name);

    // Get date columns for selected table
    // Supports: DATE, DATETIME, TIMESTAMP, TIME (text), INTEGER (unix timestamp), REAL (julian day)
    const getDateColumns = (): { name: string; type: string }[] => {
        if (!tableColumns || tableColumns.length === 0) return [];

        const dateTypePatterns = ['date', 'time', 'timestamp'];
        const dateNamePatterns = ['date', 'time', 'created', 'updated', 'modified', 'at', 'on'];

        return tableColumns.filter((c: { name: string; type: string }) => {
            const typeLower = c.type?.toLowerCase() || '';
            const nameLower = c.name?.toLowerCase() || '';

            // Check type patterns (DATE, DATETIME, TIMESTAMP, TIME)
            if (dateTypePatterns.some(p => typeLower.includes(p))) return true;

            // INTEGER and REAL can store timestamps (unix timestamp or julian day)
            if (typeLower === 'integer' || typeLower === 'real') {
                // Only include if column name suggests it's a date
                if (dateNamePatterns.some(p => nameLower.includes(p))) return true;
            }

            // Check column name patterns
            if (dateNamePatterns.some(p => nameLower.includes(p))) return true;

            return false;
        });
    };

    const fetchData = async () => {
        if (!activeConnection) return;
        setLoading(true);
        try {
            const [pList, policyList, schemaData] = await Promise.all([
                invoke<TablePartitionInfo[]>('get_partition_info', { connectionId: activeConnection.id }),
                invoke<PartitionPolicy[]>('get_partition_policies', { connectionId: activeConnection.id }),
                invoke<SchemaInfo>('get_schema', { connectionId: activeConnection.id })
            ]);
            setPartitions(pList);
            setPolicies(policyList);
            setTables(schemaData?.tables || []);
        } catch (error) {
            console.error('Failed to fetch partition data:', error);
            addNotification({ type: 'error', title: 'Data Load Failed', message: 'Could not retrieve partition info.' });
        } finally {
            setLoading(false);
        }
    };

    const createPolicy = async () => {
        if (!activeConnection) return;
        if (!selectedTable) {
            addNotification({ type: 'warning', title: 'Validation', message: 'Please select a table.' });
            return;
        }
        if (!dateColumn) {
            addNotification({ type: 'warning', title: 'Validation', message: 'Please select a date column.' });
            return;
        }

        setCreating(true);
        try {
            const request: CreatePolicyRequest = {
                tableName: selectedTable,
                dateColumn: dateColumn,
                partitionInterval: partitionInterval,
                retentionDays: retentionDays,
            };
            await invoke<PartitionPolicy>('create_partition_policy', {
                connectionId: activeConnection.id,
                request
            });
            addNotification({ type: 'success', title: 'Policy Created', message: `Partition policy for ${selectedTable} has been created.` });
            setShowPolicyModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            addNotification({ type: 'error', title: 'Creation Failed', message: String(error) });
        } finally {
            setCreating(false);
        }
    };

    const deletePolicy = async (policyId: string) => {
        if (!activeConnection) return;
        try {
            await invoke('delete_partition_policy', {
                connectionId: activeConnection.id,
                policyId
            });
            addNotification({ type: 'info', title: 'Policy Deleted', message: 'Partition policy has been removed.' });
            fetchData();
        } catch (error) {
            addNotification({ type: 'error', title: 'Delete Failed', message: String(error) });
        }
    };

    const runMaintenance = async () => {
        if (!activeConnection) return;
        setRunningMaintenance(true);
        try {
            const result = await invoke<MaintenanceResult>('run_partition_maintenance', {
                connectionId: activeConnection.id
            });
            addNotification({
                type: 'success',
                title: 'Maintenance Complete',
                message: `Processed ${result.policiesProcessed} policies. Deleted ${result.rowsDeleted} rows, ${result.partitionsDeleted} partitions.`
            });
            if (result.details.length > 0) {
                console.log('Maintenance details:', result.details);
            }
            fetchData();
        } catch (error) {
            addNotification({ type: 'error', title: 'Maintenance Failed', message: String(error) });
        } finally {
            setRunningMaintenance(false);
        }
    };

    const resetForm = () => {
        setSelectedTable('');
        setDateColumn('');
        setPartitionInterval('monthly');
        setRetentionDays(30);
    };

    useEffect(() => {
        fetchData();
    }, [activeConnection]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        <Layers size={24} className={styles.titleIcon} />
                        Partition Management
                    </h2>
                    <p className={styles.subtitle}>
                        Configure automatic partitioning and data retention policies
                    </p>
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.secondaryButton}
                        onClick={runMaintenance}
                        disabled={runningMaintenance || policies.length === 0}
                    >
                        <Play size={14} />
                        {runningMaintenance ? 'Running...' : 'Run Maintenance'}
                    </button>
                    <button className={styles.primaryButton} onClick={() => setShowPolicyModal(true)}>
                        <Plus size={16} />
                        New Policy
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {/* Summary Cards */}
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Active Policies</div>
                        <div className={styles.summaryValue}>{policies.length}</div>
                        <div className={styles.summarySubtext}>Partition rules configured</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Partitioned Tables</div>
                        <div className={styles.summaryValue}>{partitions.length}</div>
                        <div className={styles.summarySubtext}>Logical table groups</div>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <span>Loading partition data...</span>
                    </div>
                ) : (
                    <>
                        {/* Partition Policies Section */}
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Settings size={18} />
                                Partition Policies
                            </h3>
                            {policies.length === 0 ? (
                                <div className={styles.empty}>
                                    <Activity size={48} className={styles.emptyIcon} />
                                    <h3>No Policies Configured</h3>
                                    <p>Create a partition policy to automatically manage table data based on date.</p>
                                </div>
                            ) : (
                                <div className={styles.policyGrid}>
                                    {policies.map(policy => (
                                        <div key={policy.id} className={styles.policyCard}>
                                            <div className={styles.policyHeader}>
                                                <span className={styles.policyTableName}>{policy.tableName}</span>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => deletePolicy(policy.id)}
                                                    title="Delete policy"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className={styles.policyMeta}>
                                                <div className={styles.metaItem}>
                                                    <Calendar size={12} />
                                                    <span>Column: {policy.dateColumn}</span>
                                                </div>
                                                <div className={styles.metaItem}>
                                                    <Clock size={12} />
                                                    <span>Interval: {policy.partitionInterval}</span>
                                                </div>
                                            </div>
                                            <div className={styles.retentionBadge}>
                                                {policy.retentionDays > 0
                                                    ? `Delete after ${policy.retentionDays} days`
                                                    : 'No auto-delete'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Detected Partitions Section */}
                        {partitions.length > 0 && (
                            <section className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <Table size={18} />
                                    Detected Partition Sets
                                </h3>
                                <div className={styles.partitionList}>
                                    {partitions.map(part => (
                                        <div key={part.baseTable} className={styles.partitionCard}>
                                            <div className={styles.partMain}>
                                                <div className={styles.partHeader}>
                                                    <h4 className={styles.baseName}>{part.baseTable}</h4>
                                                    <span className={styles.rowTag}>{part.totalRows.toLocaleString()} Rows</span>
                                                </div>
                                                <div className={styles.shardTags}>
                                                    {part.partitions.map(p => (
                                                        <span key={p} className={styles.shardTag}>{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Create Policy Modal */}
            {showPolicyModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPolicyModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>
                                <Settings size={20} />
                                Create Partition Policy
                            </h3>
                            <button className={styles.closeButton} onClick={() => setShowPolicyModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Table</label>
                                <select
                                    value={selectedTable}
                                    onChange={(e) => { setSelectedTable(e.target.value); setDateColumn(''); }}
                                    className={styles.formSelect}
                                >
                                    <option value="">Select a table...</option>
                                    {availableTables.map((t: string) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Date Column</label>
                                <select
                                    value={dateColumn}
                                    onChange={(e) => setDateColumn(e.target.value)}
                                    className={styles.formSelect}
                                    disabled={!selectedTable}
                                >
                                    <option value="">Select date column...</option>
                                    {getDateColumns().map((c: { name: string; type: string }) => (
                                        <option key={c.name} value={c.name}>
                                            {c.name} ({c.type})
                                        </option>
                                    ))}
                                    {/* Allow manual entry if no date columns detected */}
                                    {selectedTable && getDateColumns().length === 0 && (
                                        <option value="">No date columns detected - enter manually below</option>
                                    )}
                                </select>
                                {selectedTable && getDateColumns().length === 0 && (
                                    <input
                                        type="text"
                                        placeholder="Enter column name manually"
                                        value={dateColumn}
                                        onChange={(e) => setDateColumn(e.target.value)}
                                        className={styles.formInput}
                                        style={{ marginTop: '0.5rem' }}
                                    />
                                )}
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Partition Interval</label>
                                    <select
                                        value={partitionInterval}
                                        onChange={(e) => setPartitionInterval(e.target.value)}
                                        className={styles.formSelect}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Retention (days)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(parseInt(e.target.value) || 0)}
                                        className={styles.formInput}
                                    />
                                    <small className={styles.formHint}>0 = keep forever</small>
                                </div>
                            </div>
                            <div className={styles.policyPreview}>
                                <strong>Policy Preview:</strong>
                                <p>
                                    Data in <code>{selectedTable || '...'}</code> will be partitioned by
                                    <code> {dateColumn || '...'}</code> ({partitionInterval}).
                                    {retentionDays > 0
                                        ? ` Records older than ${retentionDays} days will be automatically deleted.`
                                        : ' No automatic deletion.'}
                                </p>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => { setShowPolicyModal(false); resetForm(); }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={createPolicy}
                                disabled={creating || !selectedTable || !dateColumn}
                            >
                                {creating ? 'Creating...' : 'Create Policy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartitionManagementDashboard;

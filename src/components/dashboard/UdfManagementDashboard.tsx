'use client';

import React, { useEffect, useState } from 'react';
import { FunctionSquare, Search, Plus, Activity, Cpu, ShieldCheck, Trash2, X, Code } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './UdfManagementDashboard.module.css';

interface UdfInfo {
    name: string;
    argCount: number;
    deterministic: boolean;
    description?: string;
}

interface CreateUdfRequest {
    name: string;
    argCount: number;
    deterministic: boolean;
    expression: string;
    description?: string;
}

const UdfManagementDashboard: React.FC = () => {
    const { activeConnection } = useDatabaseStore();
    const { addNotification } = useUIStore();
    const [udfs, setUdfs] = useState<UdfInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // New Function form state
    const [newName, setNewName] = useState('');
    const [newArgCount, setNewArgCount] = useState(0);
    const [newDeterministic, setNewDeterministic] = useState(true);
    const [newExpression, setNewExpression] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchUdfs = async () => {
        if (!activeConnection) return;
        setLoading(true);
        try {
            const list = await invoke<UdfInfo[]>('get_udf_list', { connectionId: activeConnection.id });
            setUdfs(list);
        } catch (error) {
            console.error('Failed to fetch UDFs:', error);
            addNotification({ type: 'error', title: 'Fetch Failed', message: 'Could not retrieve UDF list.' });
        } finally {
            setLoading(false);
        }
    };

    const registerBuiltIns = async () => {
        if (!activeConnection) return;
        try {
            await invoke('register_built_in_udfs', { connectionId: activeConnection.id });
            addNotification({ type: 'success', title: 'Built-ins Registered', message: 'Standard UDFs are now active.' });
            fetchUdfs();
        } catch (error) {
            addNotification({ type: 'error', title: 'Registration Failed', message: String(error) });
        }
    };

    const createFunction = async () => {
        if (!activeConnection) return;
        if (!newName.trim()) {
            addNotification({ type: 'warning', title: 'Validation', message: 'Function name is required.' });
            return;
        }
        if (!newExpression.trim()) {
            addNotification({ type: 'warning', title: 'Validation', message: 'Expression is required.' });
            return;
        }

        setCreating(true);
        try {
            const request: CreateUdfRequest = {
                name: newName.trim(),
                argCount: newArgCount,
                deterministic: newDeterministic,
                expression: newExpression.trim(),
                description: newDescription.trim() || undefined,
            };
            await invoke<UdfInfo>('create_user_function', {
                connectionId: activeConnection.id,
                request
            });
            addNotification({ type: 'success', title: 'Function Created', message: `${newName} has been registered.` });
            setShowModal(false);
            resetForm();
            fetchUdfs();
        } catch (error) {
            addNotification({ type: 'error', title: 'Creation Failed', message: String(error) });
        } finally {
            setCreating(false);
        }
    };

    const deleteFunction = async (name: string) => {
        if (!activeConnection) return;
        try {
            await invoke('delete_user_function', {
                connectionId: activeConnection.id,
                functionName: name
            });
            addNotification({ type: 'info', title: 'Function Marked', message: `${name} will be removed on reconnection.` });
            // Note: SQLite doesn't support removing functions at runtime
        } catch (error) {
            addNotification({ type: 'error', title: 'Delete Failed', message: String(error) });
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewArgCount(0);
        setNewDeterministic(true);
        setNewExpression('');
        setNewDescription('');
    };

    useEffect(() => {
        fetchUdfs();
    }, [activeConnection]);

    const filteredUdfs = udfs.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        <FunctionSquare size={24} className={styles.titleIcon} />
                        UDF Registry
                    </h2>
                    <p className={styles.subtitle}>
                        Manage custom SQLite functions and extensions
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.secondaryButton} onClick={registerBuiltIns}>
                        Register Standard UDFs
                    </button>
                    <button className={styles.primaryButton} onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        New Function
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.searchBar}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search functions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <span>Loading registry...</span>
                    </div>
                ) : filteredUdfs.length === 0 ? (
                    <div className={styles.empty}>
                        <Activity size={48} className={styles.emptyIcon} />
                        <h3>No UDFs Found</h3>
                        <p>Register built-ins or create custom functions to extend SQLite.</p>
                    </div>
                ) : (
                    <div className={styles.udfGrid}>
                        {filteredUdfs.map((udf) => (
                            <div key={udf.name} className={styles.udfCard}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.udfName}>{udf.name}</h3>
                                    <span className={styles.typeTag}>SCALAR</span>
                                </div>
                                <div className={styles.udfMeta}>
                                    <div className={styles.metaItem}>
                                        <Cpu size={14} />
                                        <span>{udf.argCount === -1 ? 'Variadic' : `${udf.argCount} Args`}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <ShieldCheck size={14} />
                                        <span>{udf.deterministic ? 'Deterministic' : 'Non-deterministic'}</span>
                                    </div>
                                </div>
                                <p className={styles.udfDesc}>
                                    {udf.description || 'Custom user-defined function for enhanced query logic.'}
                                </p>
                                <div className={styles.cardActions}>
                                    <button
                                        className={styles.iconButton}
                                        title="Delete"
                                        onClick={() => deleteFunction(udf.name)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Function Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>
                                <Code size={20} />
                                Create New Function
                            </h3>
                            <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Function Name</label>
                                <input
                                    type="text"
                                    placeholder="my_function"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Argument Count</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={newArgCount}
                                        onChange={(e) => setNewArgCount(parseInt(e.target.value) || 0)}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={newDeterministic}
                                            onChange={(e) => setNewDeterministic(e.target.checked)}
                                        />
                                        Deterministic
                                    </label>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>SQL Expression</label>
                                <textarea
                                    placeholder="Use $1, $2, etc. for arguments. Example: UPPER($1) || '_' || $2"
                                    value={newExpression}
                                    onChange={(e) => setNewExpression(e.target.value)}
                                    className={styles.formTextarea}
                                    rows={4}
                                />
                                <small className={styles.formHint}>
                                    Use $1, $2, $3... to reference function arguments in order.
                                </small>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Brief description of what this function does"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className={styles.formInput}
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => { setShowModal(false); resetForm(); }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={createFunction}
                                disabled={creating}
                            >
                                {creating ? 'Creating...' : 'Create Function'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UdfManagementDashboard;

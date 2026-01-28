'use client';

import React from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useQueryStore } from '@/stores/queryStore';
import { useUIStore } from '@/stores/uiStore';
import { Clock, Play, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './HistoryDashboard.module.css';

const HistoryDashboard: React.FC = () => {
    const { items, clearHistory, removeFromHistory } = useHistoryStore();
    const { addTab, updateTabContent } = useQueryStore();
    const { setActiveView } = useUIStore();

    const handleRestore = (sql: string) => {
        addTab('Restored Query');
        updateTabContent(useQueryStore.getState().activeTabId!, sql);
        setActiveView('editor');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        <Clock size={24} style={{ color: 'var(--brand-primary)' }} />
                        Query History
                    </h2>
                    <p className={styles.subtitle}>
                        Tracking last {items.length} executions
                    </p>
                </div>
                <button onClick={clearHistory} className={styles.clearButton}>
                    <Trash2 size={14} />
                    Clear All
                </button>
            </div>

            <div className={styles.list}>
                {items.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <Clock size={32} style={{ opacity: 0.3 }} />
                        </div>
                        No execution history found yet.
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className={styles.historyItem}>
                            <div className={styles.itemLeft}>
                                <div className={`${styles.statusIcon} ${item.status === 'success' ? styles.success : styles.error}`}>
                                    {item.status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div className={styles.itemContent}>
                                    <div className={styles.sql}>{item.sql}</div>
                                    <div className={styles.meta}>
                                        <span>{new Date(item.executedAt).toLocaleString()}</span>
                                        <span>•</span>
                                        <span className={styles.duration}>{item.durationMs > 0 ? `${item.durationMs}ms` : 'Failed'}</span>
                                        <span>•</span>
                                        <span className={styles.connection}>{item.connectionId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <button
                                    onClick={() => handleRestore(item.sql)}
                                    className={styles.restoreButton}
                                    title="Open in Editor"
                                >
                                    <Play size={14} fill="currentColor" />
                                </button>
                                <button
                                    onClick={() => removeFromHistory(item.id)}
                                    className={styles.deleteButton}
                                    title="Remove from History"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryDashboard;

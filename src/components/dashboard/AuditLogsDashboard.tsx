'use client';

import React from 'react';
import { Shield, FileText, Database, Clock, ArrowRight } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import styles from './AuditLogsDashboard.module.css';

const AuditLogsDashboard: React.FC = () => {
    const { dataChanges } = useEvents({ maxLogEntries: 50 });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        <Shield size={24} style={{ color: 'var(--brand-secondary)' }} />
                        Audit Logs
                    </h2>
                    <p className={styles.subtitle}>
                        Real-time database operation history and security events
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                {dataChanges.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <FileText size={48} style={{ opacity: 0.3 }} />
                        </div>
                        <h3 className={styles.emptyTitle}>No Audit Logs Available</h3>
                        <p className={styles.emptyDesc}>
                            Audit logs will appear here when database operations are performed.
                            All DDL and DML operations are tracked for security purposes.
                        </p>
                    </div>
                ) : (
                    <div className={styles.logList}>
                        {dataChanges.map((log, index) => (
                            <div key={index} className={styles.logItem}>
                                <div className={styles.logIcon}>
                                    <Database size={16} />
                                </div>
                                <div className={styles.logMain}>
                                    <div className={styles.logHeader}>
                                        <span className={`${styles.operation} ${styles[log.operation.toLowerCase()]}`}>
                                            {log.operation}
                                        </span>
                                        <span className={styles.table}>
                                            {log.table}
                                        </span>
                                        <ArrowRight size={14} className={styles.arrow} />
                                        <span className={styles.rowid}>
                                            ID: {log.rowid}
                                        </span>
                                    </div>
                                    <div className={styles.logFooter}>
                                        <Clock size={12} />
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogsDashboard;

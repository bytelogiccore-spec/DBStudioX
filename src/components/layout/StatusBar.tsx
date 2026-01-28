'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDatabaseStore } from '@/stores/databaseStore';
import styles from './StatusBar.module.css';

const StatusBar: React.FC = () => {
    const { i18n } = useTranslation();
    const { activeConnection } = useDatabaseStore();

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'ko' : 'en';
        i18n.changeLanguage(nextLang);
    };

    return (
        <footer className={styles.statusBar}>
            <div className={styles.left}>
                <div className={styles.connectionStatus}>
                    <div className={`${styles.statusDot} ${activeConnection ? styles.connected : styles.disconnected}`} />
                    <span className={styles.statusText}>
                        {activeConnection ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                {activeConnection && (
                    <div className={styles.pathInfo}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(0, 217, 255, 0.7)' }}>storage</span>
                        <span className={styles.pathText}>{activeConnection.path}</span>
                    </div>
                )}
            </div>

            <div className={styles.right}>
                <button onClick={toggleLanguage} className={styles.langButton}>
                    <span className={styles.langText}>
                        {i18n.language === 'en' ? 'EN' : 'KO'}
                    </span>
                </button>
                <div className={styles.encoding}>
                    <span>UTF-8</span>
                </div>
                <div className={styles.sqliteInfo}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--text-muted)' }}>analytics</span>
                    <span>SQLite 3.x</span>
                </div>
            </div>
        </footer>
    );
};

export default StatusBar;

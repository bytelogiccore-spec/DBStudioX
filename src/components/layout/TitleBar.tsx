'use client';

import React from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import styles from './TitleBar.module.css';

const TitleBar: React.FC = () => {
    const handleMinimize = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const appWindow = getCurrentWindow();
            await appWindow.minimize();
        } catch (e) {
            console.error('Failed to minimize:', e);
        }
    };

    const handleMaximize = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const appWindow = getCurrentWindow();
            const isMaximized = await appWindow.isMaximized();
            if (isMaximized) {
                await appWindow.unmaximize();
            } else {
                await appWindow.maximize();
            }
        } catch (e) {
            console.error('Failed to maximize:', e);
        }
    };

    const handleClose = async () => {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const appWindow = getCurrentWindow();
            await appWindow.close();
        } catch (e) {
            console.error('Failed to close:', e);
        }
    };

    return (
        <div className={styles.titleBar} data-tauri-drag-region>
            <div className={styles.left} data-tauri-drag-region>
                <div className={styles.logoIcon}>
                    <span className="material-symbols-outlined">database</span>
                </div>
                <span className={styles.title}>DBStudioX</span>
            </div>

            <div className={styles.windowControls}>
                <button
                    className={styles.controlButton}
                    onClick={handleMinimize}
                    aria-label="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button
                    className={styles.controlButton}
                    onClick={handleMaximize}
                    aria-label="Maximize"
                >
                    <Square size={12} />
                </button>
                <button
                    className={`${styles.controlButton} ${styles.closeButton}`}
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;

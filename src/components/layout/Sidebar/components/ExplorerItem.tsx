'use client';

import React, { useState } from 'react';
import styles from '../../Sidebar.module.css';

import { LucideIcon, ChevronRight } from 'lucide-react';

interface ExplorerItemProps {
    icon: LucideIcon;
    label: string;
    count?: number;
    collapsed?: boolean;
    children?: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent) => void;
    onCollapsedClick?: () => void;
}

const ExplorerItem: React.FC<ExplorerItemProps> = ({ icon: Icon, label, count, collapsed, children, onContextMenu, onCollapsedClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (collapsed) {
        return (
            <button
                className={styles.collapsedItem}
                onClick={onCollapsedClick}
                onContextMenu={onContextMenu}
                title={label}
            >
                <Icon size={18} style={{ color: 'var(--brand-primary)', opacity: 0.7 }} />
                {count !== undefined && count > 0 && (
                    <span className={styles.collapsedCount}>{count}</span>
                )}
            </button>
        );
    }

    return (
        <div className={styles.explorerItem}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                onContextMenu={onContextMenu}
                className={styles.explorerButton}
            >
                <div className={styles.explorerLeft}>
                    <ChevronRight
                        size={14}
                        className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
                    />
                    <Icon size={16} style={{ color: 'var(--brand-primary)', opacity: 0.7 }} />
                    <span className={styles.explorerLabel}>{label}</span>
                </div>
                {count !== undefined && (
                    <span className={styles.explorerCount}>{count}</span>
                )}
            </button>
            {isOpen && children && (
                <div className={styles.explorerChildren}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default ExplorerItem;

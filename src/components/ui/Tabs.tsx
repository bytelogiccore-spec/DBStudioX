import React from 'react';
import styles from './Tabs.module.css';
import { X, LucideIcon } from 'lucide-react';

export interface TabItem {
    id: string;
    label: string;
    icon?: LucideIcon;
    closable?: boolean;
}

interface TabsProps {
    tabs: TabItem[];
    activeTabId: string;
    onTabChange: (id: string) => void;
    onTabClose?: (id: string) => void;
    extra?: React.ReactNode;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTabId,
    onTabChange,
    onTabClose,
    extra,
    className = ''
}) => {
    return (
        <div className={`${styles.tabsContainer} ${className}`}>
            <div className={styles.tabList}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tabTrigger} ${activeTabId === tab.id ? styles.active : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.icon && <tab.icon size={14} />}
                        <span>{tab.label}</span>
                        {tab.closable && onTabClose && (
                            <span
                                className={styles.closeButton}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                }}
                            >
                                <X size={12} />
                            </span>
                        )}
                    </button>
                ))}
                {extra && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>{extra}</div>}
            </div>
        </div>
    );
};

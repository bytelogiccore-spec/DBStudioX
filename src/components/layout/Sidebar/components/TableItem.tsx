'use client';

import React, { useState } from 'react';
import styles from '../../Sidebar.module.css';

interface TableItemProps {
    name: string;
    indexes: any[];
    triggers: any[];
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onIndexContextMenu?: (e: React.MouseEvent, indexName: string) => void;
    onTriggerContextMenu?: (e: React.MouseEvent, triggerName: string) => void;
}

const TableItem: React.FC<TableItemProps> = ({
    name,
    indexes,
    triggers,
    onClick,
    onContextMenu,
    onIndexContextMenu,
    onTriggerContextMenu
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = indexes.length > 0 || triggers.length > 0;

    return (
        <div className={styles.tableItem}>
            <div className={styles.tableRow}>
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                        className={styles.expandBtn}
                    >
                        <span className={`material-symbols-outlined ${styles.chevronSmall} ${isOpen ? styles.open : ''}`}>
                            chevron_right
                        </span>
                    </button>
                )}
                <button
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    className={styles.subItem}
                    style={{ paddingLeft: hasChildren ? '0' : '1.25rem' }}
                >
                    {name}
                </button>
            </div>
            {isOpen && hasChildren && (
                <div className={styles.tableChildren}>
                    {indexes.length > 0 && (
                        <div className={styles.childGroup}>
                            <span className={styles.childGroupLabel}>
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>inventory_2</span>
                                Indexes ({indexes.length})
                            </span>
                            {indexes.map(idx => (
                                <button
                                    key={idx.name}
                                    className={styles.childItem}
                                    onContextMenu={(e) => onIndexContextMenu?.(e, idx.name)}
                                >
                                    {idx.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {triggers.length > 0 && (
                        <div className={styles.childGroup}>
                            <span className={styles.childGroupLabel}>
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bolt</span>
                                Triggers ({triggers.length})
                            </span>
                            {triggers.map(trg => (
                                <button
                                    key={trg.name}
                                    className={styles.childItem}
                                    onContextMenu={(e) => onTriggerContextMenu?.(e, trg.name)}
                                >
                                    {trg.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TableItem;

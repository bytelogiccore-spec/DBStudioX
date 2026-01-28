'use client';

import React from 'react';
import styles from '../../Sidebar.module.css';

interface ExplorerSubItemProps {
    label: string;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

const ExplorerSubItem: React.FC<ExplorerSubItemProps> = ({ label, onClick, onContextMenu }) => (
    <button onClick={onClick} onContextMenu={onContextMenu} className={styles.subItem}>
        {label}
    </button>
);

export default ExplorerSubItem;

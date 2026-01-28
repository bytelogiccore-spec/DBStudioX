'use client';

import React from 'react';
import styles from '../../Sidebar.module.css';

import { LucideIcon } from 'lucide-react';

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    collapsed?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active = false, collapsed, onClick }) => {
    if (collapsed) {
        return (
            <button
                onClick={onClick}
                className={`${styles.collapsedItem} ${active ? styles.active : ''}`}
                title={label}
            >
                <Icon size={18} />
            </button>
        );
    }

    return (
        <button onClick={onClick} className={`${styles.navItem} ${active ? styles.active : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );
};

export default NavItem;

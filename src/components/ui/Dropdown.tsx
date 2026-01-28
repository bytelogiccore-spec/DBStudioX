import React from 'react';
import styles from './Dropdown.module.css';
import { LucideIcon } from 'lucide-react';

export interface DropdownItem {
    id?: string;
    label?: string;
    icon?: LucideIcon;
    onClick?: () => void;
    danger?: boolean;
    shortcut?: string;
    type?: 'item' | 'separator';
}

interface DropdownProps {
    items: DropdownItem[];
    onClose: () => void;
    x: number;
    y: number;
    className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
    items,
    onClose,
    x,
    y,
    className = ''
}) => {
    // Basic auto-flip if out of bounds (simplified)
    const style: React.CSSProperties = {
        left: x,
        top: y,
    };

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={`${styles.dropdown} ${className}`} style={style}>
                {items.map((item, index) => {
                    if (item.type === 'separator') {
                        return <div key={`sep-${index}`} className={styles.separator} />;
                    }
                    return (
                        <button
                            key={item.id || item.label}
                            className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick?.();
                                onClose();
                            }}
                        >
                            {item.icon && <item.icon size={16} />}
                            <span>{item.label}</span>
                            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
                        </button>
                    );
                })}
            </div>
        </>
    );
};

// Add overlay style to CSS

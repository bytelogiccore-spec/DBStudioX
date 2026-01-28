'use client';

import React, { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

interface MenuItem {
    type?: 'separator';
    label?: string;
    icon?: string;
    danger?: boolean;
    onClick?: () => void;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Use setTimeout to avoid the same click that opened the menu from closing it
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside, true);
            document.addEventListener('click', handleClickOutside, true);
            document.addEventListener('keydown', handleEscape);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('click', handleClickOutside, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position if menu would overflow viewport
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            if (y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            menuRef.current.style.left = `${adjustedX}px`;
            menuRef.current.style.top = `${adjustedY}px`;
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={{ left: x, top: y }}
        >
            {items.map((item, index) => {
                if (item.type === 'separator') {
                    return <div key={index} className={styles.separator} />;
                }

                return (
                    <button
                        key={index}
                        className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                        onClick={() => {
                            item.onClick?.();
                            onClose();
                        }}
                    >
                        {item.icon && (
                            <span className="material-symbols-outlined">{item.icon}</span>
                        )}
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ContextMenu;

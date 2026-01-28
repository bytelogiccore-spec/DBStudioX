import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'outline';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'info',
    className = ''
}) => {
    return (
        <span className={`${styles.badge} ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
};

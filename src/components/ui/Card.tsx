import React from 'react';
import styles from './Card.module.css';
import { LucideIcon } from 'lucide-react';

interface CardProps {
    title?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    footer?: React.ReactNode;
    headerAction?: React.ReactNode;
    hoverable?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}

export const Card: React.FC<CardProps> = ({
    title,
    icon: Icon,
    children,
    footer,
    headerAction,
    hoverable,
    onClick,
    disabled,
    className = ''
}) => {
    const handleClick = () => {
        if (!disabled && onClick) {
            onClick();
        }
    };

    return (
        <div
            className={`${styles.card} ${hoverable && !disabled ? styles.hoverable : ''} ${disabled ? styles.disabled : ''} ${className}`}
            onClick={handleClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick && !disabled ? 0 : -1}
            aria-disabled={disabled}
        >
            {(title || Icon || headerAction) && (
                <div className={styles.header}>
                    <div className={styles.title}>
                        {Icon && <Icon size={20} className="text-brand-primary" />}
                        {title && <span>{title}</span>}
                    </div>
                    {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
                </div>
            )}
            <div className={styles.content}>
                {children}
            </div>
            {footer && (
                <div className={styles.footer}>
                    {footer}
                </div>
            )}
        </div>
    );
};

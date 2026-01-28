import React from 'react';
import styles from './Button.module.css';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    isLoading?: boolean;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    isLoading,
    fullWidth,
    className = '',
    disabled,
    ...props
}) => {
    const buttonClasses = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        !children && Icon ? styles.iconOnly : '',
        className
    ].join(' ').trim();

    return (
        <button
            className={buttonClasses}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <div className={styles.spinner}>
                    <svg viewBox="0 0 24 24" className={styles.animateSpin}>
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            )}
            {!isLoading && Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 18} />}
            {children}
            {!isLoading && Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : 18} />}
        </button>
    );
};

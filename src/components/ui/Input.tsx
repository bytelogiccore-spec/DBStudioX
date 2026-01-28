import React, { forwardRef } from 'react';
import styles from './Input.module.css';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    iconLeft?: LucideIcon;
    iconRight?: LucideIcon;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    iconLeft: IconLeft,
    iconRight: IconRight,
    fullWidth = true,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`${styles.inputContainer} ${error ? styles.error : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={`
                ${styles.inputWrapper} 
                ${IconLeft ? styles.hasIconLeft : ''} 
                ${IconRight ? styles.hasIconRight : ''}
            `}>
                {IconLeft && <IconLeft className={styles.iconLeft} size={18} />}
                <input
                    ref={ref}
                    className={styles.input}
                    {...props}
                />
                {IconRight && <IconRight className={styles.iconRight} size={18} />}
            </div>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';

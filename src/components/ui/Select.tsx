import React from 'react';
import styles from './Select.module.css';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: SelectOption[];
    error?: string;
    fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    fullWidth = true,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.selectContainer} ${error ? styles.error : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.selectWrapper}>
                <select className={styles.select} {...props}>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className={styles.chevron} size={18} />
            </div>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};

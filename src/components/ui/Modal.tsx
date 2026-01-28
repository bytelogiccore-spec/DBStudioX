import React, { useEffect } from 'react';
import styles from './Modal.module.css';
import { X, LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
    closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    icon: Icon,
    children,
    footer,
    size = 'md',
    className = '',
    closeOnOverlayClick = true
}) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className={styles.overlay}
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className={`${styles.modal} ${styles[size]} ${className}`}
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <div className={styles.title}>
                        {Icon && <Icon size={20} className="text-brand-primary" />}
                        <span>{title}</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.content}>
                    {children}
                </div>
                {footer && (
                    <div className={styles.footer}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    // Using Portal to render at body level
    return createPortal(modalContent, document.body);
};

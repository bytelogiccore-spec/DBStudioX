'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import styles from './Toast.module.css';

const Toast: React.FC = () => {
    const { notifications, markNotificationRead } = useUIStore();
    const [visibleToasts, setVisibleToasts] = useState<string[]>([]);

    // Show new notifications as toasts
    useEffect(() => {
        const unreadNotifications = notifications.filter(n => !n.read);
        const newToasts = unreadNotifications.map(n => n.id).filter(id => !visibleToasts.includes(id));

        if (newToasts.length > 0) {
            setVisibleToasts(prev => [...prev, ...newToasts]);

            // Auto-dismiss after 4 seconds
            newToasts.forEach(id => {
                setTimeout(() => {
                    setVisibleToasts(prev => prev.filter(t => t !== id));
                    markNotificationRead(id);
                }, 4000);
            });
        }
    }, [notifications]);

    const handleDismiss = (id: string) => {
        setVisibleToasts(prev => prev.filter(t => t !== id));
        markNotificationRead(id);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={20} />;
            case 'error': return <AlertCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            default: return <Info size={20} />;
        }
    };

    const toastsToShow = notifications.filter(n => visibleToasts.includes(n.id)).slice(0, 5);

    if (toastsToShow.length === 0) return null;

    return (
        <div className={styles.container}>
            {toastsToShow.map((toast) => (
                <div
                    key={toast.id}
                    className={`${styles.toast} ${styles[toast.type]}`}
                >
                    <div className={styles.icon}>
                        {getIcon(toast.type)}
                    </div>
                    <div className={styles.content}>
                        <p className={styles.title}>{toast.title}</p>
                        <p className={styles.message}>{toast.message}</p>
                    </div>
                    <button
                        className={styles.close}
                        onClick={() => handleDismiss(toast.id)}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;

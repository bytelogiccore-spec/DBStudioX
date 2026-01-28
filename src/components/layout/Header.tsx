'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, Settings, X, Check, AlertCircle, Info, CheckCircle2, Clock } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDatabaseStore } from '@/stores/databaseStore';
import { dbService } from '@/services/dbService';
import { SchemaInfo } from '@/schemas/query';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './Header.module.css';

const Header: React.FC = () => {
    const { activeConnection } = useDatabaseStore();
    const {
        searchOpen,
        searchQuery,
        setSearchQuery,
        toggleSearch,
        closeSearch,
        notifications,
        notificationPanelOpen,
        toggleNotificationPanel,
        closeNotificationPanel,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        setActiveView,
    } = useUIStore();

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Search results state
    const [searchResults, setSearchResults] = useState<{ tables: string[]; views: string[] }>({ tables: [], views: [] });
    const [schema, setSchema] = useState<SchemaInfo | null>(null);

    // Fetch schema for search
    useEffect(() => {
        if (activeConnection) {
            dbService.getSchema(activeConnection.id).then(setSchema).catch(console.error);
        }
    }, [activeConnection]);

    // Filter search results
    useEffect(() => {
        if (!schema || !searchQuery.trim()) {
            setSearchResults({ tables: [], views: [] });
            return;
        }

        const query = searchQuery.toLowerCase();
        const tables = schema.tables
            .filter(t => t.name.toLowerCase().includes(query))
            .map(t => t.name)
            .slice(0, 5);
        const views = schema.views
            .filter(v => v.name.toLowerCase().includes(query))
            .map(v => v.name)
            .slice(0, 3);

        setSearchResults({ tables, views });
    }, [schema, searchQuery]);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch();
            }
            if (e.key === 'Escape' && searchOpen) {
                closeSearch();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearch, closeSearch, searchOpen]);

    // Focus search input when opened
    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    // Close panels when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                closeSearch();
            }
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
                closeNotificationPanel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeSearch, closeNotificationPanel]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className={styles.notifIconSuccess} />;
            case 'error': return <AlertCircle size={16} className={styles.notifIconError} />;
            case 'warning': return <AlertCircle size={16} className={styles.notifIconWarning} />;
            default: return <Info size={16} className={styles.notifIconInfo} />;
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <h2 className={styles.title}>Workspace</h2>
                {activeConnection && (
                    <div className={styles.connectionBadge}>
                        <div className={styles.statusDot} />
                        <span className={styles.connectionName}>{activeConnection.name}</span>
                        <span className={styles.connectionMode}>Connected via WAL</span>
                    </div>
                )}
            </div>

            <div className={styles.right}>
                {/* Search */}
                <div className={styles.searchContainer} ref={searchContainerRef}>
                    <Input
                        ref={searchInputRef}
                        placeholder="Search tables, views... (⌘K)"
                        className={styles.searchBox}
                        iconLeft={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => !searchOpen && toggleSearch()}
                        iconRight={searchOpen ? X : undefined}
                    />

                    {/* Search Results Dropdown */}
                    {searchOpen && searchQuery && (searchResults.tables.length > 0 || searchResults.views.length > 0) && (
                        <div className={styles.searchDropdown}>
                            {searchResults.tables.length > 0 && (
                                <div className={styles.searchGroup}>
                                    <span className={styles.searchGroupLabel}>Tables</span>
                                    {searchResults.tables.map(table => (
                                        <button
                                            key={table}
                                            className={styles.searchItem}
                                            onClick={() => { closeSearch(); }}
                                        >
                                            <span className="material-symbols-outlined">table_rows</span>
                                            {table}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searchResults.views.length > 0 && (
                                <div className={styles.searchGroup}>
                                    <span className={styles.searchGroupLabel}>Views</span>
                                    {searchResults.views.map(view => (
                                        <button
                                            key={view}
                                            className={styles.searchItem}
                                            onClick={() => { closeSearch(); }}
                                        >
                                            <span className="material-symbols-outlined">view_agenda</span>
                                            {view}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.divider} />

                <div className={styles.actions}>
                    {/* Notifications */}
                    <div className={styles.notificationContainer} ref={notificationRef}>
                        <div style={{ position: 'relative' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={Bell}
                                onClick={toggleNotificationPanel}
                                className={notificationPanelOpen ? styles.active : ''}
                            />
                            {unreadCount > 0 && (
                                <Badge
                                    variant="error"
                                    className={styles.notificationBadge}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </div>

                        {/* Notification Panel */}
                        {notificationPanelOpen && (
                            <div className={styles.notificationPanel}>
                                <div className={styles.notificationHeader}>
                                    <span>Notifications</span>
                                    <div className={styles.notificationActions}>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllNotificationsRead} className={styles.markAllRead}>
                                                <Check size={12} /> Mark all read
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.notificationList}>
                                    {notifications.length === 0 ? (
                                        <div className={styles.noNotifications}>
                                            <Bell size={24} />
                                            <span>No notifications</span>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map(notif => (
                                            <div
                                                key={notif.id}
                                                className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
                                                onClick={() => markNotificationRead(notif.id)}
                                            >
                                                {getNotificationIcon(notif.type)}
                                                <div className={styles.notificationContent}>
                                                    <span className={styles.notificationTitle}>{notif.title}</span>
                                                    <span className={styles.notificationMessage}>{notif.message}</span>
                                                    <span className={styles.notificationTime}>
                                                        <Clock size={10} /> {formatTime(notif.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className={styles.notificationFooter}>
                                        <button onClick={clearNotifications}>Clear all</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Settings}
                        onClick={() => setActiveView('settings')}
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;

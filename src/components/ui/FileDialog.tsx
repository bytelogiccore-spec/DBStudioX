'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    X, Folder, File, HardDrive, Home, ChevronRight, ChevronUp,
    FolderPlus, RefreshCw, Search, Monitor, FileText, Download, Image
} from 'lucide-react';
import styles from './FileDialog.module.css';

// ============================================================================
// Types
// ============================================================================

export interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    modified: number | null;
    extension: string | null;
}

export interface DriveInfo {
    name: string;
    path: string;
    is_removable: boolean;
}

export interface FileDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog closes */
    onClose: () => void;
    /** Callback when file/path is selected */
    onSelect: (path: string) => void;
    /** Dialog mode: 'open' for opening files, 'save' for saving files */
    mode: 'open' | 'save';
    /** Dialog title */
    title?: string;
    /** File type filters */
    filters?: { name: string; extensions: string[] }[];
    /** Default file name (for save mode) */
    defaultFileName?: string;
    /** Allow selecting directories */
    selectDirectory?: boolean;
    /** Custom class name for styling */
    className?: string;
}

// ============================================================================
// File Dialog Component
// ============================================================================

const FileDialog: React.FC<FileDialogProps> = ({
    open,
    onClose,
    onSelect,
    mode,
    title,
    filters = [],
    defaultFileName = '',
    selectDirectory = false,
    className = '',
}) => {
    const [currentPath, setCurrentPath] = useState<string>('');
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [drives, setDrives] = useState<DriveInfo[]>([]);
    const [specialDirs, setSpecialDirs] = useState<DriveInfo[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
    const [fileName, setFileName] = useState(defaultFileName);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pathHistory, setPathHistory] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<number>(0);

    // Load initial data
    useEffect(() => {
        if (open) {
            loadInitialData();
        }
    }, [open]);

    // Reload directory when filter changes
    useEffect(() => {
        if (open && currentPath) {
            loadDirectory(currentPath);
        }
    }, [activeFilter]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get drives and special directories
            const [drivesData, specialData, homePath] = await Promise.all([
                invoke<DriveInfo[]>('get_drives'),
                invoke<DriveInfo[]>('get_special_directories'),
                invoke<string>('get_home_directory'),
            ]);

            setDrives(drivesData);
            setSpecialDirs(specialData);

            // Start in home directory
            if (homePath) {
                await loadDirectory(homePath);
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    const loadDirectory = useCallback(async (path: string) => {
        try {
            setLoading(true);
            setError(null);
            setSelectedEntry(null);

            const entriesData = await invoke<FileEntry[]>('list_directory', { path });

            // Apply filters if in open mode
            let filteredEntries = entriesData;
            if (mode === 'open' && filters.length > 0 && activeFilter < filters.length) {
                const allowedExtensions = filters[activeFilter].extensions;
                if (!allowedExtensions.includes('*')) {
                    filteredEntries = entriesData.filter(e =>
                        e.is_dir || (e.extension && allowedExtensions.includes(e.extension.toLowerCase()))
                    );
                }
            }

            setEntries(filteredEntries);
            setCurrentPath(path);
            setPathHistory(prev => [...prev.slice(-9), path]);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, [mode, filters, activeFilter]);

    const handleNavigateUp = async () => {
        try {
            const parent = await invoke<string | null>('get_parent_directory', { path: currentPath });
            if (parent) {
                await loadDirectory(parent);
            }
        } catch (err) {
            setError(String(err));
        }
    };

    const handleEntryClick = (entry: FileEntry) => {
        setSelectedEntry(entry);
        if (!entry.is_dir && mode === 'save') {
            setFileName(entry.name);
        }
    };

    const handleEntryDoubleClick = async (entry: FileEntry) => {
        if (entry.is_dir) {
            await loadDirectory(entry.path);
        } else {
            // Select the file
            onSelect(entry.path);
            onClose();
        }
    };

    const handleConfirm = () => {
        if (mode === 'open') {
            if (selectDirectory && currentPath) {
                onSelect(currentPath);
                onClose();
            } else if (selectedEntry && !selectedEntry.is_dir) {
                onSelect(selectedEntry.path);
                onClose();
            }
        } else {
            // Save mode
            if (fileName.trim()) {
                const fullPath = currentPath.endsWith('\\') || currentPath.endsWith('/')
                    ? `${currentPath}${fileName}`
                    : `${currentPath}\\${fileName}`;
                onSelect(fullPath);
                onClose();
            }
        }
    };

    const handleQuickNav = async (path: string) => {
        await loadDirectory(path);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const getFileIcon = (entry: FileEntry) => {
        if (entry.is_dir) return <Folder size={18} className={styles.folderIcon} />;

        const ext = entry.extension?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
            return <Image size={18} className={styles.imageIcon} />;
        }
        if (['sql', 'db', 'sqlite', 'sqlite3'].includes(ext || '')) {
            return <FileText size={18} className={styles.sqlIcon} />;
        }
        return <File size={18} className={styles.fileIcon} />;
    };

    const filteredEntries = entries.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!open) return null;

    return (
        <div className={`${styles.overlay} ${className}`} onClick={onClose}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {title || (mode === 'open' ? 'Open File' : 'Save File')}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className={styles.toolbar}>
                    <button
                        className={styles.toolbarButton}
                        onClick={handleNavigateUp}
                        disabled={!currentPath}
                    >
                        <ChevronUp size={18} />
                    </button>
                    <div className={styles.pathBar}>
                        <span className={styles.pathText}>{currentPath}</span>
                    </div>
                    <button
                        className={styles.toolbarButton}
                        onClick={() => loadDirectory(currentPath)}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Main Content */}
                <div className={styles.content}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarSection}>
                            <span className={styles.sidebarLabel}>Quick Access</span>
                            {specialDirs.map((dir) => (
                                <button
                                    key={dir.path}
                                    className={styles.sidebarItem}
                                    onClick={() => handleQuickNav(dir.path)}
                                >
                                    {dir.name === 'Home' ? <Home size={16} /> :
                                        dir.name === 'Desktop' ? <Monitor size={16} /> :
                                            dir.name === 'Downloads' ? <Download size={16} /> :
                                                <Folder size={16} />}
                                    <span>{dir.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.sidebarSection}>
                            <span className={styles.sidebarLabel}>Drives</span>
                            {drives.map((drive) => (
                                <button
                                    key={drive.path}
                                    className={styles.sidebarItem}
                                    onClick={() => handleQuickNav(drive.path)}
                                >
                                    <HardDrive size={16} />
                                    <span>{drive.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* File List */}
                    <div className={styles.fileList}>
                        {/* Search */}
                        <div className={styles.searchBar}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Files */}
                        <div className={styles.files}>
                            {loading ? (
                                <div className={styles.loading}>Loading...</div>
                            ) : error ? (
                                <div className={styles.error}>{error}</div>
                            ) : filteredEntries.length === 0 ? (
                                <div className={styles.empty}>No files found</div>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <div
                                        key={entry.path}
                                        className={`${styles.fileItem} ${selectedEntry?.path === entry.path ? styles.selected : ''}`}
                                        onClick={() => handleEntryClick(entry)}
                                        onDoubleClick={() => handleEntryDoubleClick(entry)}
                                    >
                                        {getFileIcon(entry)}
                                        <span className={styles.fileName}>{entry.name}</span>
                                        <span className={styles.fileSize}>
                                            {!entry.is_dir && formatFileSize(entry.size)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    {mode === 'save' && (
                        <div className={styles.fileNameInput}>
                            <label>File name:</label>
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="Enter file name..."
                            />
                        </div>
                    )}

                    {filters.length > 0 && (
                        <div className={styles.filterSelect}>
                            <label>File type:</label>
                            <select
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(Number(e.target.value))}
                            >
                                {filters.map((filter, idx) => (
                                    <option key={idx} value={idx}>
                                        {filter.name} ({filter.extensions.join(', ')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={styles.confirmButton}
                            onClick={handleConfirm}
                            disabled={mode === 'open' ? (!selectedEntry && !selectDirectory) : !fileName.trim()}
                        >
                            {mode === 'open' ? 'Open' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileDialog;

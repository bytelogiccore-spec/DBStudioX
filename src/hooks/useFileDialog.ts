'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// useFileDialog Hook
// Easy-to-use hook for file dialog operations
// ============================================================================

export interface UseFileDialogOptions {
    /** File type filters */
    filters?: { name: string; extensions: string[] }[];
    /** Default file name (for save mode) */
    defaultFileName?: string;
    /** Allow selecting directories */
    selectDirectory?: boolean;
    /** Dialog title */
    title?: string;
}

export interface UseFileDialogReturn {
    /** Whether the dialog is currently open */
    isOpen: boolean;
    /** Open the dialog in "open file" mode */
    openFile: (options?: UseFileDialogOptions) => Promise<string | null>;
    /** Open the dialog in "save file" mode */
    saveFile: (options?: UseFileDialogOptions) => Promise<string | null>;
    /** Close the dialog */
    close: () => void;
    /** Current dialog mode */
    mode: 'open' | 'save';
    /** Current dialog options */
    options: UseFileDialogOptions;
    /** Handler for when a file is selected */
    onSelect: (path: string) => void;
    /** Handler for when the dialog is closed */
    onClose: () => void;
}

export const useFileDialog = (): UseFileDialogReturn => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'open' | 'save'>('open');
    const [options, setOptions] = useState<UseFileDialogOptions>({});
    const [resolvePromise, setResolvePromise] = useState<((path: string | null) => void) | null>(null);

    const openFile = useCallback((opts: UseFileDialogOptions = {}): Promise<string | null> => {
        return new Promise((resolve) => {
            setMode('open');
            setOptions(opts);
            setIsOpen(true);
            setResolvePromise(() => resolve);
        });
    }, []);

    const saveFile = useCallback((opts: UseFileDialogOptions = {}): Promise<string | null> => {
        return new Promise((resolve) => {
            setMode('save');
            setOptions(opts);
            setIsOpen(true);
            setResolvePromise(() => resolve);
        });
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        if (resolvePromise) {
            resolvePromise(null);
            setResolvePromise(null);
        }
    }, [resolvePromise]);

    const onSelect = useCallback((path: string) => {
        if (resolvePromise) {
            resolvePromise(path);
            setResolvePromise(null);
        }
        setIsOpen(false);
    }, [resolvePromise]);

    const onClose = useCallback(() => {
        if (resolvePromise) {
            resolvePromise(null);
            setResolvePromise(null);
        }
        setIsOpen(false);
    }, [resolvePromise]);

    return {
        isOpen,
        openFile,
        saveFile,
        close,
        mode,
        options,
        onSelect,
        onClose,
    };
};

// ============================================================================
// Pre-configured filter sets for common file types
// ============================================================================

export const FILE_FILTERS = {
    database: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3', 'db3'] },
        { name: 'All Files', extensions: ['*'] },
    ],
    sql: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
    ],
    csv: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
    ],
    json: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
    ],
    export: [
        { name: 'CSV', extensions: ['csv'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'SQL', extensions: ['sql'] },
    ],
    images: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
        { name: 'All Files', extensions: ['*'] },
    ],
    all: [
        { name: 'All Files', extensions: ['*'] },
    ],
};

export default useFileDialog;

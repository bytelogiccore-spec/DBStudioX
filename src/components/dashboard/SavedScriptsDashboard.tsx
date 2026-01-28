'use client';

import React, { useState, useEffect } from 'react';
import { Star, FileCode, Plus, FolderOpen, Trash2, Edit2, Play, Save, Clock, File } from 'lucide-react';
import { useQueryStore } from '@/stores/queryStore';
import { useUIStore } from '@/stores/uiStore';
import FileDialog from '@/components/ui/FileDialog';
import { useFileDialog, FILE_FILTERS } from '@/hooks/useFileDialog';
import styles from './SavedScriptsDashboard.module.css';

interface SavedScript {
    id: string;
    name: string;
    content: string;
    path?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SavedScriptsDashboard: React.FC = () => {
    const { addTab, updateTabContent, activeTabId, tabs } = useQueryStore();
    const { setActiveView, addNotification } = useUIStore();
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    // Custom file dialog
    const fileDialog = useFileDialog();

    // Load saved scripts from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('dbstudiox_saved_scripts');
        if (stored) {
            try {
                const scripts = JSON.parse(stored);
                setSavedScripts(scripts.map((s: any) => ({
                    ...s,
                    createdAt: new Date(s.createdAt),
                    updatedAt: new Date(s.updatedAt),
                })));
            } catch (e) {
                console.error('Failed to parse saved scripts:', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to localStorage whenever scripts change (but only after initial load)
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('dbstudiox_saved_scripts', JSON.stringify(savedScripts));
        }
    }, [savedScripts, isInitialized]);

    const handleSaveCurrentQuery = () => {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab || !activeTab.content.trim()) {
            addNotification({
                type: 'warning',
                title: 'No Query to Save',
                message: 'Please enter a SQL query in the editor first.',
            });
            return;
        }

        const newScript: SavedScript = {
            id: `script-${Date.now()}`,
            name: activeTab.title || `Query ${savedScripts.length + 1}`,
            content: activeTab.content,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        setSavedScripts(prev => [newScript, ...prev]);
        addNotification({
            type: 'success',
            title: 'Script Saved',
            message: `"${newScript.name}" has been saved.`,
        });
    };

    const handleOpenScript = (script: SavedScript) => {
        addTab(script.name);
        const { activeTabId: newTabId } = useQueryStore.getState();
        if (newTabId) {
            updateTabContent(newTabId, script.content);
            setActiveView('editor');
        }
    };

    const handleDeleteScript = (id: string) => {
        const script = savedScripts.find(s => s.id === id);
        setSavedScripts(prev => prev.filter(s => s.id !== id));
        if (script) {
            addNotification({
                type: 'info',
                title: 'Script Deleted',
                message: `"${script.name}" has been removed.`,
            });
        }
    };

    const handleStartEdit = (script: SavedScript) => {
        setEditingId(script.id);
        setEditName(script.name);
    };

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            setSavedScripts(prev => prev.map(s =>
                s.id === editingId
                    ? { ...s, name: editName.trim(), updatedAt: new Date() }
                    : s
            ));
        }
        setEditingId(null);
        setEditName('');
    };

    const handleImportFile = async () => {
        // Use custom file dialog
        const selected = await fileDialog.openFile({
            filters: FILE_FILTERS.sql,
            title: 'Import SQL File'
        });

        if (selected) {
            try {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const content = await readTextFile(selected);
                const fileName = selected.split(/[/\\]/).pop() || 'Imported Script';

                const newScript: SavedScript = {
                    id: `script-${Date.now()}`,
                    name: fileName.replace('.sql', ''),
                    content,
                    path: selected,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                setSavedScripts(prev => [newScript, ...prev]);
                addNotification({
                    type: 'success',
                    title: 'File Imported',
                    message: `"${newScript.name}" has been imported.`,
                });
            } catch (e) {
                console.error('Failed to import file:', e);
                addNotification({
                    type: 'error',
                    title: 'Import Failed',
                    message: 'Failed to read the selected file.',
                });
            }
        }
    };

    const handleExportScript = async (script: SavedScript) => {
        // Use custom file dialog
        const filePath = await fileDialog.saveFile({
            filters: FILE_FILTERS.sql,
            title: 'Export SQL Script',
            defaultFileName: `${script.name}.sql`
        });

        if (filePath) {
            try {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(filePath, script.content);
                addNotification({
                    type: 'success',
                    title: 'Script Exported',
                    message: `Saved to ${filePath}`,
                });
            } catch (e) {
                console.error('Failed to export file:', e);
                addNotification({
                    type: 'error',
                    title: 'Export Failed',
                    message: 'Failed to export the script.',
                });
            }
        }
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>
                            <Star size={24} style={{ color: 'var(--brand-warning)' }} />
                            Saved Scripts
                        </h2>
                        <p className={styles.subtitle}>
                            Your favorite queries saved for quick access
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} onClick={handleImportFile}>
                            <FolderOpen size={14} />
                            Import File
                        </button>
                        <button className={styles.addButton} onClick={handleSaveCurrentQuery}>
                            <Plus size={14} />
                            Save Current Query
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {savedScripts.length === 0 ? (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>
                                <FileCode size={48} style={{ opacity: 0.3 }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Saved Scripts Yet</h3>
                            <p className={styles.emptyDesc}>
                                Save your frequently used queries for quick access.
                                Click &quot;Save Current Query&quot; or import from a file.
                            </p>
                            <div className={styles.emptyActions}>
                                <button className={styles.emptyButton} onClick={handleImportFile}>
                                    <FolderOpen size={14} />
                                    Import SQL File
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.scriptList}>
                            {savedScripts.map(script => (
                                <div key={script.id} className={styles.scriptItem}>
                                    <div className={styles.scriptIcon}>
                                        <File size={20} />
                                    </div>
                                    <div className={styles.scriptInfo}>
                                        {editingId === script.id ? (
                                            <input
                                                type="text"
                                                className={styles.editInput}
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={styles.scriptName}>{script.name}</span>
                                        )}
                                        <span className={styles.scriptMeta}>
                                            <Clock size={10} /> {formatDate(script.updatedAt)}
                                            {script.path && <span className={styles.scriptPath}> • {script.path.split(/[/\\]/).pop()}</span>}
                                        </span>
                                        <code className={styles.scriptPreview}>
                                            {script.content.slice(0, 100)}{script.content.length > 100 ? '...' : ''}
                                        </code>
                                    </div>
                                    <div className={styles.scriptActions}>
                                        <button
                                            className={styles.scriptBtn}
                                            onClick={() => handleOpenScript(script)}
                                            title="Open in Editor"
                                        >
                                            <Play size={14} />
                                        </button>
                                        <button
                                            className={styles.scriptBtn}
                                            onClick={() => handleExportScript(script)}
                                            title="Export to File"
                                        >
                                            <Save size={14} />
                                        </button>
                                        <button
                                            className={styles.scriptBtn}
                                            onClick={() => handleStartEdit(script)}
                                            title="Rename"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className={`${styles.scriptBtn} ${styles.deleteBtn}`}
                                            onClick={() => handleDeleteScript(script.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom File Dialog */}
            <FileDialog
                open={fileDialog.isOpen}
                mode={fileDialog.mode}
                onSelect={fileDialog.onSelect}
                onClose={fileDialog.onClose}
                title={fileDialog.options.title}
                filters={fileDialog.options.filters}
                defaultFileName={fileDialog.options.defaultFileName}
            />
        </>
    );
};

export default SavedScriptsDashboard;

'use client';

import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import styles from './SqlEditor.module.css';

// Monaco will load from node_modules by default (no CDN)

import { SchemaInfo } from '@/schemas/query';

interface SqlEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    onRun?: () => void;
    schema?: SchemaInfo | null;
}

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, onRun, schema }) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const schemaRef = useRef<SchemaInfo | null | undefined>(schema);
    const providerRef = useRef<any>(null);

    // Keep schema ref in sync with prop for the closure
    React.useEffect(() => {
        schemaRef.current = schema;
    }, [schema]);

    // Cleanup provider on unmount
    React.useEffect(() => {
        return () => {
            if (providerRef.current) {
                providerRef.current.dispose();
            }
        };
    }, []);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Define custom theme to match Sleek Glassmorphism V2
        monaco.editor.defineTheme('dbstudio-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '00d9ff', fontStyle: 'bold' }, // brand-primary
                { token: 'string', foreground: '00ff88' }, // brand-success
                { token: 'number', foreground: 'ffb800' }, // brand-warning
                { token: 'comment', foreground: '5c6370', fontStyle: 'italic' }, // text-muted
                { token: 'operator', foreground: '8dc4ce' }, // text-secondary
                { token: 'delimiter', foreground: '8dc4ce' }, // text-secondary
                { token: 'type', foreground: '8a2be2' }, // brand-secondary
                { token: 'function', foreground: '00d9ff' }, // brand-primary
                { token: 'variable', foreground: 'f5f8f8' }, // text-primary
            ],
            colors: {
                'editor.background': '#0f1115', // bg-main
                'editor.foreground': '#f5f8f8', // text-primary
                'editor.lineHighlightBackground': '#ffffff04', // Subtle highlight
                'editorLineNumber.foreground': '#5c6370', // text-muted
                'editorLineNumber.activeForeground': '#00d9ff', // brand-primary
                'editorIndentGuide.background': '#ffffff08',
                'editorIndentGuide.activeBackground': '#00d9ff40',
                'editor.selectionBackground': '#00d9ff20', // brand-primary with opacity
                'editorCursor.foreground': '#00d9ff', // brand-primary
                'editorWidget.background': '#0a0a0c', // bg-deep
                'editorWidget.border': '#ffffff08', // glass-border
                'editorSuggestWidget.background': '#0a0a0c', // bg-deep
                'editorSuggestWidget.border': '#ffffff08', // glass-border
                'editorSuggestWidget.selectedBackground': '#00d9ff20',
                'editorHoverWidget.background': '#0a0a0c', // bg-deep
                'editorHoverWidget.border': '#ffffff08', // glass-border
            }
        });

        monaco.editor.setTheme('dbstudio-dark');

        // Check if provider already exists (global registry) to avoid duplicates if possible,
        // but since we dispose on unmount, we can just register new one.
        if (providerRef.current) providerRef.current.dispose();

        // Register Completion Item Provider
        providerRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions: any[] = [];
                const currentSchema = schemaRef.current;

                if (currentSchema) {
                    // Tables
                    currentSchema.tables.forEach(table => {
                        suggestions.push({
                            label: table.name,
                            kind: monaco.languages.CompletionItemKind.Class,
                            insertText: table.name,
                            detail: `Table (${table.rowCount} rows)`,
                            documentation: `Size: ${table.sizeBytes ? (table.sizeBytes / 1024).toFixed(1) + ' KB' : 'Unknown'}`,
                            range: range,
                        });

                        // Columns (Global list for now)
                        table.columns.forEach(col => {
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                detail: `${col.type} - ${table.name}`,
                                documentation: `Column in ${table.name}${col.primaryKey ? ' (PK)' : ''}${col.nullable ? ' (Nullable)' : ''}`,
                                sortText: `0_${col.name}`, // Prioritize columns slightly higher if typed
                                range: range,
                            });
                        });
                    });

                    // Views
                    currentSchema.views.forEach(view => {
                        suggestions.push({
                            label: view.name,
                            kind: monaco.languages.CompletionItemKind.Interface,
                            insertText: view.name,
                            detail: 'View',
                            documentation: view.sql,
                            range: range,
                        });
                    });
                }

                // Standard SQL Keywords
                const keywords = [
                    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
                    'ALTER', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
                    'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'HAVING', 'AS',
                    'DISTINCT', 'VALUES', 'SET', 'IN', 'IS', 'NULL', 'NOT', 'AND', 'OR', 'LIKE',
                    'BETWEEN', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'CASE',
                    'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'PRIMARY', 'KEY', 'FOREIGN',
                    'REFERENCES', 'DEFAULT', 'CHECK', 'UNIQUE', 'PRAGMA', 'VACUUM', 'EXPLAIN', 'QUERY PLAN'
                ];

                keywords.forEach(kw => {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        range: range,
                        sortText: `1_${kw}`, // Keywords after tables/columns
                    });
                });

                return { suggestions };
            }
        });

        // Add keyboard shortcut for Run Query (Ctrl+Enter or Cmd+Enter)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onRun) onRun();
        });

        // Focus the editor
        editor.focus();
    };

    return (
        <div className={styles.container}>
            <Editor
                height="100%"
                width="100%"
                defaultLanguage="sql"
                theme="dbstudio-dark"
                value={value}
                onChange={onChange}
                onMount={handleEditorDidMount}
                loading={<div className={styles.loading}>Loading SQL Editor...</div>}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    lineHeight: 24,
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    renderLineHighlight: 'all',
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                }}
            />
        </div>
    );
};

export default SqlEditor;

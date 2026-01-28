'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key, Hash } from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { executeQuery } from '@/lib/tauri';
import styles from './SchemaModal.module.css';

interface Column {
    name: string;
    type: string;
    notNull: boolean;
    primaryKey: boolean;
    defaultValue: string;
}

interface SchemaModalProps {
    type: 'table' | 'view' | 'index' | 'trigger';
    mode: 'create' | 'edit';
    item?: any;
    parentTable?: string | null;
    onClose: () => void;
    onSave: () => void;
}

const SchemaModal: React.FC<SchemaModalProps> = ({
    type,
    mode,
    item,
    parentTable,
    onClose,
    onSave,
}) => {
    const { activeConnection } = useDatabaseStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Table state
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<Column[]>([
        { name: 'id', type: 'INTEGER', notNull: true, primaryKey: true, defaultValue: '' }
    ]);

    // View state
    const [viewName, setViewName] = useState('');
    const [viewSql, setViewSql] = useState('');

    // Index state
    const [indexName, setIndexName] = useState('');
    const [indexTable, setIndexTable] = useState(parentTable || '');
    const [indexColumns, setIndexColumns] = useState('');
    const [indexUnique, setIndexUnique] = useState(false);

    // Trigger state
    const [triggerName, setTriggerName] = useState('');
    const [triggerTable, setTriggerTable] = useState(parentTable || '');
    const [triggerTiming, setTriggerTiming] = useState<'BEFORE' | 'AFTER' | 'INSTEAD OF'>('BEFORE');
    const [triggerEvent, setTriggerEvent] = useState<'INSERT' | 'UPDATE' | 'DELETE'>('INSERT');
    const [triggerBody, setTriggerBody] = useState('');

    useEffect(() => {
        if (mode === 'edit' && item) {
            if (type === 'table') {
                setTableName(item.name);
                if (item.columns) {
                    setColumns(item.columns.map((c: any) => ({
                        name: c.name,
                        type: c.type,
                        notNull: c.notNull,
                        primaryKey: c.primaryKey,
                        defaultValue: c.defaultValue || '',
                    })));
                }
            } else if (type === 'view') {
                setViewName(item.name);
                setViewSql(item.sql || '');
            } else if (type === 'index') {
                setIndexName(item.name);
                setIndexTable(item.tableName || '');
                setIndexColumns(item.columns?.join(', ') || '');
                setIndexUnique(item.unique || false);
            } else if (type === 'trigger') {
                setTriggerName(item.name);
                setTriggerTable(item.tableName || '');
                setTriggerBody(item.sql || '');
            }
        }
    }, [mode, item, type]);

    const addColumn = () => {
        setColumns([
            ...columns,
            { name: '', type: 'TEXT', notNull: false, primaryKey: false, defaultValue: '' }
        ]);
    };

    const removeColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const updateColumn = (index: number, field: keyof Column, value: any) => {
        const updated = [...columns];
        const currentColumn = updated[index];
        updated[index] = {
            name: currentColumn.name ?? '',
            type: currentColumn.type ?? 'TEXT',
            notNull: currentColumn.notNull ?? false,
            primaryKey: currentColumn.primaryKey ?? false,
            defaultValue: currentColumn.defaultValue ?? '',
            [field]: value
        };
        setColumns(updated);
    };

    const generateTableSql = () => {
        const columnDefs = columns.map(col => {
            let def = `"${col.name}" ${col.type}`;
            if (col.primaryKey) def += ' PRIMARY KEY';
            if (col.notNull && !col.primaryKey) def += ' NOT NULL';
            if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
            return def;
        });
        return `CREATE TABLE "${tableName}" (\n  ${columnDefs.join(',\n  ')}\n);`;
    };

    const generateViewSql = () => {
        return `CREATE VIEW "${viewName}" AS\n${viewSql};`;
    };

    const generateIndexSql = () => {
        const unique = indexUnique ? 'UNIQUE ' : '';
        return `CREATE ${unique}INDEX "${indexName}" ON "${indexTable}" (${indexColumns});`;
    };

    const generateTriggerSql = () => {
        return `CREATE TRIGGER "${triggerName}"\n${triggerTiming} ${triggerEvent} ON "${triggerTable}"\nBEGIN\n  ${triggerBody}\nEND;`;
    };

    const handleSave = async () => {
        if (!activeConnection) return;

        setLoading(true);
        setError(null);

        try {
            let sql = '';

            // For edit mode, we need to drop and recreate (SQLite limitation)
            if (mode === 'edit' && item) {
                const dropSql = type === 'table'
                    ? `DROP TABLE IF EXISTS "${item.name}";`
                    : type === 'view'
                        ? `DROP VIEW IF EXISTS "${item.name}";`
                        : type === 'index'
                            ? `DROP INDEX IF EXISTS "${item.name}";`
                            : `DROP TRIGGER IF EXISTS "${item.name}";`;

                await executeQuery(activeConnection.id, dropSql);
            }

            switch (type) {
                case 'table':
                    sql = generateTableSql();
                    break;
                case 'view':
                    sql = generateViewSql();
                    break;
                case 'index':
                    sql = generateIndexSql();
                    break;
                case 'trigger':
                    sql = generateTriggerSql();
                    break;
            }

            await executeQuery(activeConnection.id, sql);
            onSave();
        } catch (err: any) {
            setError(err.message || 'Failed to execute SQL');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        const action = mode === 'create' ? 'Create' : 'Edit';
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        return `${action} ${typeLabel}`;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>{getTitle()}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Table Form */}
                    {type === 'table' && (
                        <div className={styles.form}>
                            <div className={styles.field}>
                                <label>Table Name</label>
                                <input
                                    type="text"
                                    value={tableName}
                                    onChange={e => setTableName(e.target.value)}
                                    placeholder="my_table"
                                />
                            </div>

                            <div className={styles.columnsSection}>
                                <div className={styles.columnsHeader}>
                                    <h4>Columns</h4>
                                    <button onClick={addColumn} className={styles.addBtn}>
                                        <Plus size={14} /> Add Column
                                    </button>
                                </div>

                                <div className={styles.columnsTable}>
                                    <div className={styles.columnsTableHeader}>
                                        <span>Column Name</span>
                                        <span>Data Type</span>
                                        <span title="Primary Key">PK</span>
                                        <span title="Not Null">NN</span>
                                        <span>Default</span>
                                        <span></span>
                                    </div>
                                    {columns.map((col, idx) => (
                                        <div key={idx} className={styles.columnsTableRow}>
                                            <input
                                                type="text"
                                                value={col.name}
                                                onChange={e => updateColumn(idx, 'name', e.target.value)}
                                                placeholder="column_name"
                                            />
                                            <select
                                                value={col.type}
                                                onChange={e => updateColumn(idx, 'type', e.target.value)}
                                            >
                                                {/* Core SQLite Storage Classes */}
                                                <option value="" disabled>── Core Types ──</option>
                                                <option value="INTEGER">INTEGER</option>
                                                <option value="TEXT">TEXT</option>
                                                <option value="REAL">REAL</option>
                                                <option value="BLOB">BLOB</option>
                                                <option value="NUMERIC">NUMERIC</option>
                                                {/* Integer Affinity */}
                                                <option value="" disabled>── Integer ──</option>
                                                <option value="INT">INT</option>
                                                <option value="TINYINT">TINYINT</option>
                                                <option value="SMALLINT">SMALLINT</option>
                                                <option value="MEDIUMINT">MEDIUMINT</option>
                                                <option value="BIGINT">BIGINT</option>
                                                <option value="BOOLEAN">BOOLEAN</option>
                                                {/* Text Affinity */}
                                                <option value="" disabled>── Text ──</option>
                                                <option value="VARCHAR(255)">VARCHAR(255)</option>
                                                <option value="CHAR(50)">CHAR(50)</option>
                                                <option value="CLOB">CLOB</option>
                                                {/* Real Affinity */}
                                                <option value="" disabled>── Real ──</option>
                                                <option value="DOUBLE">DOUBLE</option>
                                                <option value="FLOAT">FLOAT</option>
                                                {/* Date/Time */}
                                                <option value="" disabled>── Date/Time ──</option>
                                                <option value="DATE">DATE</option>
                                                <option value="DATETIME">DATETIME</option>
                                                <option value="TIMESTAMP">TIMESTAMP</option>
                                                {/* Numeric */}
                                                <option value="" disabled>── Numeric ──</option>
                                                <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                                            </select>
                                            <input
                                                type="checkbox"
                                                checked={col.primaryKey ?? false}
                                                onChange={e => updateColumn(idx, 'primaryKey', e.target.checked)}
                                            />
                                            <input
                                                type="checkbox"
                                                checked={col.notNull ?? false}
                                                onChange={e => updateColumn(idx, 'notNull', e.target.checked)}
                                            />
                                            <input
                                                type="text"
                                                value={col.defaultValue ?? ''}
                                                onChange={e => updateColumn(idx, 'defaultValue', e.target.value)}
                                                placeholder="NULL"
                                            />
                                            <button
                                                onClick={() => removeColumn(idx)}
                                                className={styles.removeBtn}
                                                disabled={columns.length === 1}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.preview}>
                                <h4>SQL Preview</h4>
                                <pre>{generateTableSql()}</pre>
                            </div>
                        </div>
                    )}

                    {/* View Form */}
                    {type === 'view' && (
                        <div className={styles.form}>
                            <div className={styles.field}>
                                <label>View Name</label>
                                <input
                                    type="text"
                                    value={viewName}
                                    onChange={e => setViewName(e.target.value)}
                                    placeholder="my_view"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>SELECT Statement</label>
                                <textarea
                                    value={viewSql}
                                    onChange={e => setViewSql(e.target.value)}
                                    placeholder="SELECT * FROM table_name"
                                    rows={8}
                                />
                            </div>
                            <div className={styles.preview}>
                                <h4>SQL Preview</h4>
                                <pre>{generateViewSql()}</pre>
                            </div>
                        </div>
                    )}

                    {/* Index Form */}
                    {type === 'index' && (
                        <div className={styles.form}>
                            <div className={styles.field}>
                                <label>Index Name</label>
                                <input
                                    type="text"
                                    value={indexName}
                                    onChange={e => setIndexName(e.target.value)}
                                    placeholder="idx_table_column"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Table</label>
                                <input
                                    type="text"
                                    value={indexTable}
                                    onChange={e => setIndexTable(e.target.value)}
                                    placeholder="table_name"
                                    disabled={!!parentTable}
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Columns (comma separated)</label>
                                <input
                                    type="text"
                                    value={indexColumns}
                                    onChange={e => setIndexColumns(e.target.value)}
                                    placeholder="column1, column2"
                                />
                            </div>
                            <div className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    id="unique"
                                    checked={indexUnique}
                                    onChange={e => setIndexUnique(e.target.checked)}
                                />
                                <label htmlFor="unique">Unique Index</label>
                            </div>
                            <div className={styles.preview}>
                                <h4>SQL Preview</h4>
                                <pre>{generateIndexSql()}</pre>
                            </div>
                        </div>
                    )}

                    {/* Trigger Form */}
                    {type === 'trigger' && (
                        <div className={styles.form}>
                            <div className={styles.field}>
                                <label>Trigger Name</label>
                                <input
                                    type="text"
                                    value={triggerName}
                                    onChange={e => setTriggerName(e.target.value)}
                                    placeholder="trg_table_event"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Table</label>
                                <input
                                    type="text"
                                    value={triggerTable}
                                    onChange={e => setTriggerTable(e.target.value)}
                                    placeholder="table_name"
                                    disabled={!!parentTable}
                                />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label>Timing</label>
                                    <select
                                        value={triggerTiming}
                                        onChange={e => setTriggerTiming(e.target.value as any)}
                                    >
                                        <option value="BEFORE">BEFORE</option>
                                        <option value="AFTER">AFTER</option>
                                        <option value="INSTEAD OF">INSTEAD OF</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>Event</label>
                                    <select
                                        value={triggerEvent}
                                        onChange={e => setTriggerEvent(e.target.value as any)}
                                    >
                                        <option value="INSERT">INSERT</option>
                                        <option value="UPDATE">UPDATE</option>
                                        <option value="DELETE">DELETE</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label>Trigger Body (SQL statements)</label>
                                <textarea
                                    value={triggerBody}
                                    onChange={e => setTriggerBody(e.target.value)}
                                    placeholder="UPDATE table SET updated_at = datetime('now') WHERE id = NEW.id;"
                                    rows={6}
                                />
                            </div>
                            <div className={styles.preview}>
                                <h4>SQL Preview</h4>
                                <pre>{generateTriggerSql()}</pre>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className={styles.saveBtn}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchemaModal;

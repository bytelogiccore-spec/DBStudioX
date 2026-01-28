import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { TableProperties, Key, Link as LinkIcon } from 'lucide-react';
import styles from './ErDiagram.module.css';

const TableNode = ({ data }: any) => {
    return (
        <div className={styles.tableNode}>
            <div className={styles.tableHeader}>
                <TableProperties size={14} className="mr-2 text-brand-primary" />
                <span className={styles.tableName}>{data.label}</span>
            </div>
            <div className={styles.columnList}>
                {!data.columns || data.columns.length === 0 ? (
                    <div className={styles.columnItem}>
                        <span className={styles.columnName} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            No columns found
                        </span>
                    </div>
                ) : (
                    data.columns.map((col: any) => (
                        <div key={col.name} className={styles.columnItem}>
                            <div className={styles.columnInfo}>
                                {col.primaryKey && <Key size={12} className="mr-1 text-brand-warning" />}
                                {col.foreignKey && <LinkIcon size={12} className="mr-1 text-brand-success" />}
                                <span className={styles.columnName}>{col.name}</span>
                            </div>
                            <span className={styles.columnType}>{col.dataType || col.type}</span>

                            {/* Handles for connections */}
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`${col.name}-target`}
                                className={styles.handle}
                            />
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`${col.name}-source`}
                                className={styles.handle}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default memo(TableNode);

import React, { useState, useEffect, useRef } from 'react';
import styles from './ResultGrid.module.css';
import BlobViewerModal from './BlobViewerModal';

interface GridCellProps {
    value: any;
    onUpdate: (value: any) => void;
    isChanged?: boolean;
    isDeleted?: boolean;
    columnName?: string;
}

const GridCell: React.FC<GridCellProps> = ({ value, onUpdate, isChanged, isDeleted, columnName = 'Value' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value === null ? '' : String(value));
    const [blobModalOpen, setBlobModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (String(value) !== editValue && !(value === null && editValue === '')) {
            onUpdate(editValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setEditValue(value === null ? '' : String(value));
            setIsEditing(false);
        }
    };

    const isBlob = value && typeof value === 'object' && (value as any).type === 'blob';

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                className={styles.cellInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    const renderValue = () => {
        if (value === null || value === undefined) {
            return <span className={styles.nullValue}>NULL</span>;
        }
        if (isBlob) {
            return (
                <button
                    className={styles.blobButton}
                    onClick={() => setBlobModalOpen(true)}
                >
                    &lt;BLOB {(value as any).value?.length || 0} bytes&gt;
                </button>
            );
        }
        return String(value);
    };

    return (
        <>
            <div
                className={`${styles.cellContent} ${isChanged ? styles.changed : ''} ${isDeleted ? styles.deleted : ''}`}
                onDoubleClick={() => !isBlob && setIsEditing(true)}
            >
                {renderValue()}
            </div>
            {isBlob && (
                <BlobViewerModal
                    isOpen={blobModalOpen}
                    onClose={() => setBlobModalOpen(false)}
                    data={value}
                    columnName={columnName}
                />
            )}
        </>
    );
};

export default GridCell;

import { useState, useCallback, useEffect } from 'react';
import { QueryResult } from '@/schemas/query';

export interface GridChange {
    rowIndex: number;
    columnId: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface useDataEditorOptions {
    result: QueryResult | null;
}

export const useDataEditor = ({ result }: useDataEditorOptions) => {
    // Current data being displayed (including uncommitted changes)
    const [gridData, setGridData] = useState<Record<string, unknown>[]>([]);
    // Track changes: Map of "rowIndex:colId" -> newValue
    const [changes, setChanges] = useState<Record<string, unknown>>({});
    // Track deleted rows
    const [deletedRowIndices, setDeletedRowIndices] = useState<Set<number>>(new Set());
    // Track added rows
    const [addedRows, setAddedRows] = useState<number[]>([]);

    // Initialize/Reset data when result changes
    useEffect(() => {
        if (!result || !result.columns) {
            setGridData([]);
            setChanges({});
            setDeletedRowIndices(new Set());
            setAddedRows([]);
            return;
        }

        const data = result.rows.map((row) => {
            const rowObj: Record<string, unknown> = {};
            result.columns.forEach((col, idx) => {
                rowObj[col.name] = row[idx];
            });
            return rowObj;
        });

        setGridData(data);
        setChanges({});
        setDeletedRowIndices(new Set());
        setAddedRows([]);
    }, [result]);

    const updateCell = useCallback((rowIndex: number, columnId: string, value: unknown) => {
        const changeKey = `${rowIndex}:${columnId}`;

        // We might want to check if the new value is different from the ORIGINAL value
        // But for now, just track it
        setChanges(prev => ({
            ...prev,
            [changeKey]: value
        }));

        setGridData(prev => {
            const newData = [...prev];
            newData[rowIndex] = {
                ...newData[rowIndex],
                [columnId]: value
            };
            return newData;
        });
    }, []);

    const addRow = useCallback(() => {
        if (!result) return;

        const newRow: Record<string, unknown> = {};
        result.columns.forEach(col => {
            newRow[col.name] = null;
        });

        setGridData(prev => [...prev, newRow]);
        setAddedRows(prev => [...prev, gridData.length]);
    }, [result, gridData.length]);

    const deleteRow = useCallback((rowIndex: number) => {
        setDeletedRowIndices(prev => {
            const next = new Set(prev);
            if (next.has(rowIndex)) {
                next.delete(rowIndex);
            } else {
                next.add(rowIndex);
            }
            return next;
        });
    }, []);

    const revertChanges = useCallback(() => {
        if (!result) return;

        const data = result.rows.map((row) => {
            const rowObj: Record<string, unknown> = {};
            result.columns.forEach((col, idx) => {
                rowObj[col.name] = row[idx];
            });
            return rowObj;
        });

        setGridData(data);
        setChanges({});
        setDeletedRowIndices(new Set());
        setAddedRows([]);
    }, [result]);

    const hasChanges = Object.keys(changes).length > 0 || deletedRowIndices.size > 0 || addedRows.length > 0;

    return {
        gridData,
        changes,
        deletedRowIndices,
        addedRows,
        updateCell,
        addRow,
        deleteRow,
        revertChanges,
        hasChanges
    };
};

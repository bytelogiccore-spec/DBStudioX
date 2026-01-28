'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from '@tanstack/react-table';
import { QueryResult } from '@/schemas/query';
import {
    ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Plus, Trash2, RotateCcw, Save, AlertCircle
} from 'lucide-react';
import styles from './ResultGrid.module.css';
import GridCell from './GridCell';
import { useDataEditor } from './hooks/useDataEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface ResultGridProps {
    result: QueryResult | null;
    loading?: boolean;
    tableName?: string; // Optional: used for generating SQL
    onSave?: (changes: any) => Promise<void>;
}

const ResultGrid: React.FC<ResultGridProps> = ({ result, loading, tableName, onSave }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const {
        gridData,
        changes,
        deletedRowIndices,
        addedRows,
        updateCell,
        addRow,
        deleteRow,
        revertChanges,
        hasChanges
    } = useDataEditor({ result });

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!result || !result.columns) return [];

        const cols: ColumnDef<any>[] = [
            // Row number / Actions column
            {
                id: 'actions',
                header: '#',
                cell: (info) => (
                    <div className={styles.actionCell}>
                        <span className={styles.rowCount}>{info.row.index + 1}</span>
                        <button
                            className={`${styles.rowActionButton} ${styles.deleteButton}`}
                            onClick={() => deleteRow(info.row.index)}
                            title="Delete row"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ),
                enableSorting: false,
            },
            ...result.columns.map((col) => ({
                accessorKey: col.name,
                header: col.name.toUpperCase(),
                cell: (info: any) => {
                    const rowIndex = info.row.index;
                    const columnId = info.column.id;
                    const value = info.getValue();
                    const isChanged = !!changes[`${rowIndex}:${columnId}`];
                    const isDeleted = deletedRowIndices.has(rowIndex);

                    return (
                        <GridCell
                            value={value}
                            onUpdate={(val) => updateCell(rowIndex, columnId, val)}
                            isChanged={isChanged}
                            isDeleted={isDeleted}
                            columnName={columnId}
                        />
                    );
                },
            }))
        ];

        return cols;
    }, [result, changes, deletedRowIndices, updateCell, deleteRow]);

    const table = useReactTable({
        data: gridData,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: {
                pageSize: 50,
            },
        },
    });

    const handleSave = async () => {
        if (onSave) {
            await onSave({ changes, deletedRowIndices, addedRows });
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingContent}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>EXECUTING QUERY...</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className={styles.emptyContainer}>
                No active result set. Execute a query to see data.
            </div>
        );
    }

    return (
        <div className={styles.gridContainer}>
            {/* Table Header / Global Actions */}
            <div className={styles.tableHeader}>
                <div className={styles.tableHeaderLeft}>
                    <Input
                        placeholder="Filter results..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={styles.filterInput}
                        iconLeft={ChevronRight}
                        fullWidth={false}
                    />
                    <span className={styles.rowCount}>
                        {table.getFilteredRowModel().rows.length} rows
                    </span>
                </div>

                <div className={styles.tableActions}>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Plus}
                        onClick={addRow}
                    >
                        ADD ROW
                    </Button>
                    {hasChanges && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={RotateCcw}
                                onClick={revertChanges}
                                className={styles.revertButton}
                            >
                                REVERT
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                icon={Save}
                                onClick={handleSave}
                                className={styles.saveButton}
                            >
                                APPLY CHANGES
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={header.column.getCanSort() ? styles.sortable : ''}
                                    >
                                        <div className={styles.headerContent}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getCanSort() && (
                                                <span className={styles.sortIcon}>
                                                    {{
                                                        asc: <ChevronUp size={14} />,
                                                        desc: <ChevronDown size={14} />,
                                                    }[header.column.getIsSorted() as string] ?? <ChevronsUpDown size={14} className={styles.sortIconInactive} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className={styles.noData}>
                                    No data found in result set
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className={styles.paginationControls}>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={ChevronsLeft}
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={ChevronLeft}
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={ChevronRight}
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={ChevronsRight}
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    />
                </div>
                <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                    options={[
                        { value: '25', label: '25 rows' },
                        { value: '50', label: '50 rows' },
                        { value: '100', label: '100 rows' },
                        { value: '200', label: '200 rows' },
                    ]}
                    fullWidth={false}
                />
            </div>
        </div>
    );
};

export default ResultGrid;

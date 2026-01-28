import { z } from 'zod';

export const ColumnInfoSchema = z.object({
    name: z.string(),
    dataType: z.string().optional(), // In execution result it's dataType
    type: z.string().optional(),     // In schema it might be 'type' (aliased from column_type)
    nullable: z.boolean().optional(),
    primaryKey: z.boolean().optional(),
    defaultValue: z.any().nullable().optional(),
    foreignKey: z.object({
        table: z.string(),
        column: z.string(),
    }).optional(),
});

export type ColumnInfo = z.infer<typeof ColumnInfoSchema>;

export const QueryResultSchema = z.object({
    columns: z.array(ColumnInfoSchema),
    rows: z.array(z.array(z.any())),
    affectedRows: z.number(),
    executionTimeMs: z.number(),
    queryPlan: z.string().nullable().optional(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

export const TableInfoSchema = z.object({
    name: z.string(),
    columns: z.array(ColumnInfoSchema),
    rowCount: z.number(),
    sizeBytes: z.number(),
});

export type TableInfo = z.infer<typeof TableInfoSchema>;

export const ViewInfoSchema = z.object({
    name: z.string(),
    sql: z.string(),
});

export type ViewInfo = z.infer<typeof ViewInfoSchema>;

export const IndexInfoSchema = z.object({
    name: z.string(),
    tableName: z.string(),
    columns: z.array(z.string()),
    isUnique: z.boolean(),
});

export type IndexInfo = z.infer<typeof IndexInfoSchema>;

export const TriggerInfoSchema = z.object({
    name: z.string(),
    tableName: z.string(),
    timing: z.string(), // Backend may return empty string
    event: z.string(),  // Backend may return empty string
    sql: z.string(),
});

export type TriggerInfo = z.infer<typeof TriggerInfoSchema>;

export const SchemaInfoSchema = z.object({
    tables: z.array(TableInfoSchema),
    views: z.array(ViewInfoSchema),
    indexes: z.array(IndexInfoSchema),
    triggers: z.array(TriggerInfoSchema),
});

export type SchemaInfo = z.infer<typeof SchemaInfoSchema>;

import { z } from 'zod';

export const DatabaseConnectionSchema = z.object({
    id: z.string(),
    path: z.string(),
    name: z.string(),
    isConnected: z.boolean(),
    createdAt: z.string().or(z.date()).optional(),
});

export type DatabaseConnection = z.infer<typeof DatabaseConnectionSchema>;

export const DatabaseStatsSchema = z.object({
    cacheHitRate: z.number(),
    cacheHitCount: z.number(),
    cacheMissCount: z.number(),
    queryCount: z.number(),
    avgQueryTimeMs: z.number(),
    maxQueryTimeMs: z.number(),
    minQueryTimeMs: z.number(),
    connectionPoolSize: z.number(),
    activeConnections: z.number(),
    memoryUsageBytes: z.number(),
    walSize: z.number(),
    lastCheckpoint: z.string(),
});

export type DatabaseStats = z.infer<typeof DatabaseStatsSchema>;

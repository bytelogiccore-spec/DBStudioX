import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { z } from 'zod';

/**
 * Base class for all API services.
 * Handles Tauri IPC calls with Zod validation for type safety.
 */
export class ApiService {
    /**
     * Performs a validated request to the backend.
     * @param cmd The Tauri command name
     * @param args The arguments for the command
     * @param schema The Zod schema to validate the response against
     */
    protected async request<T>(cmd: string, args: any, schema: z.ZodType<T>): Promise<T> {
        try {
            const response = await invoke(cmd, args);

            // Perform validation
            const result = schema.safeParse(response);

            if (!result.success) {
                console.error(`[ApiService] Validation failed for command "${cmd}":`, result.error.format());
                // For development, we might still want to return the data if validation failed but data is usable,
                // but for strictness we throw an error.
                throw new Error(`Invalid response format from command "${cmd}". Check console for details.`);
            }

            return result.data;
        } catch (error) {
            console.error(`[ApiService] Command "${cmd}" failed:`, error);
            throw error;
        }
    }

    /**
     * Performs a request without validation (for void return or unmodeled data).
     */
    protected async rawRequest<T = any>(cmd: string, args?: any): Promise<T> {
        try {
            return await invoke<T>(cmd, args || {});
        } catch (error) {
            console.error(`[ApiService] Raw command "${cmd}" failed:`, error);
            throw error;
        }
    }

    /**
   * Listens for an event from the backend.
   */
    protected async listen<T>(event: string, callback: (payload: T) => void): Promise<UnlistenFn> {
        return listen<T>(event, (e) => {
            callback(e.payload);
        });
    }
}

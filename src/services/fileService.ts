import { ApiService } from './apiService';
import { QueryResult } from '@/schemas/query';
import { z } from 'zod';

export class FileService extends ApiService {
    async openFileDialog(): Promise<string | null> {
        return this.rawRequest<string | null>('open_file_dialog');
    }

    async saveFileDialog(defaultName: string): Promise<string | null> {
        return this.rawRequest<string | null>('save_file_dialog', { defaultName });
    }

    async createDatabaseDialog(defaultName: string): Promise<string | null> {
        return this.rawRequest<string | null>('create_database_dialog', { defaultName });
    }

    async exportResult(
        result: QueryResult,
        format: 'csv' | 'json' | 'sql',
        outputPath: string
    ): Promise<void> {
        return this.rawRequest('export_query_result', { result, format, outputPath });
    }

    // File system navigation
    async listDirectory(path: string): Promise<any[]> {
        return this.rawRequest('list_directory', { path });
    }

    async getHomeDirectory(): Promise<string> {
        return this.rawRequest('get_home_directory');
    }

    async pathExists(path: string): Promise<boolean> {
        return this.rawRequest('path_exists', { path });
    }
}

export const fileService = new FileService();

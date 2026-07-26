import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export class FileService {
  async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  /**
   * Save uploaded file locally
   * Returns: path relative to uploads directory
   */
  async saveFile(tenantId: string, buffer: Buffer, originalName: string): Promise<string> {
    await this.ensureUploadDir();

    // Create tenant subdirectory
    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    await fs.mkdir(tenantDir, { recursive: true });

    // Generate unique filename (hash + original extension)
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const filename = `${hash}${ext}`;
    const filepath = path.join(tenantDir, filename);

    // Write file
    await fs.writeFile(filepath, buffer);

    // Return relative path for storage
    return `${tenantId}/${filename}`;
  }

  /**
   * Read file from storage
   */
  async readFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    return fs.readFile(fullPath);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  /**
   * Get file info (size, mtime)
   */
  async getFileInfo(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    try {
      const stats = await fs.stat(fullPath);
      return { size: stats.size, mtime: stats.mtime };
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * List files in a tenant directory
   */
  async listTenantFiles(tenantId: string): Promise<string[]> {
    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    try {
      const files = await fs.readdir(tenantDir);
      return files.map(f => `${tenantId}/${f}`);
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  /**
   * Clean up old files (for cleanup jobs)
   * Returns number of deleted files
   */
  async cleanupOldFiles(tenantId: string, olderThanDays: number = 30): Promise<number> {
    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let deleted = 0;

    try {
      const files = await fs.readdir(tenantDir);
      for (const file of files) {
        const filepath = path.join(tenantDir, file);
        const stats = await fs.stat(filepath);
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filepath);
          deleted++;
        }
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    return deleted;
  }
}

export const fileService = new FileService();

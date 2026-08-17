import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { MulterFile } from '@/common/types/multer.type';

export type FileCategory = 'covers' | 'models' | 'steps' | 'firmware';

export interface StoredFileInfo {
  filename: string;
  originalName: string;
  url: string;
  filePath: string;
  sizeBytes: number;
  mimeType: string;
  format?: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>(
      'storage.uploadDir',
      path.join(process.cwd(), 'uploads'),
    );
    this.baseUrl = this.configService.get<string>('storage.baseUrl', '/api/files');
  }

  onModuleInit() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const categories: FileCategory[] = ['covers', 'models', 'steps', 'firmware'];
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    for (const cat of categories) {
      const catDir = path.join(this.uploadDir, cat);
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
    }
    this.logger.log(`📁 Local storage directories initialized at: ${this.uploadDir}`);
  }

  /**
   * Save an uploaded file buffer to local disk
   */
  async saveFile(
    category: FileCategory,
    file: MulterFile,
    prefix = '',
  ): Promise<StoredFileInfo> {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = originalExt.replace(/[^a-z0-9.]/gi, '');
    const uniqueId = nanoid(10);
    const prefixStr = prefix ? `${prefix}_` : '';
    const filename = `${prefixStr}${Date.now()}_${uniqueId}${sanitizedExt}`;

    const targetDir = path.join(this.uploadDir, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    const relativeUrl = `${this.baseUrl}/${category}/${filename}`;

    let format: string | undefined;
    if (category === 'models') {
      if (sanitizedExt === '.glb') format = 'glb';
      else if (sanitizedExt === '.gltf') format = 'gltf';
      else if (sanitizedExt === '.stl') format = 'stl';
    }

    return {
      filename,
      originalName: file.originalname,
      url: relativeUrl,
      filePath,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      format,
    };
  }

  /**
   * Get absolute path for a stored file
   */
  getFilePath(category: string, filename: string): string {
    // Sanitize filename and category to avoid path traversal
    const safeCategory = path.basename(category);
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeCategory, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('common.file_not_found');
    }

    return filePath;
  }

  /**
   * Delete a stored file
   */
  async deleteFile(category: string, filename: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(category, filename);
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract category and filename from a URL
   */
  parseUrl(url: string): { category: string; filename: string } | null {
    if (!url) return null;
    const parts = url.split('/');
    if (parts.length < 2) return null;
    const filename = parts[parts.length - 1];
    const category = parts[parts.length - 2];
    return { category, filename };
  }
}

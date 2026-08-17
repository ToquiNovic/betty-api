import { registerAs } from '@nestjs/config';
import * as path from 'path';

export default registerAs('storage', () => ({
  uploadDir: process.env.STORAGE_UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  baseUrl: process.env.STORAGE_BASE_URL || '/api/files',
  maxFileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE || '104857600', 10), // 100MB
}));

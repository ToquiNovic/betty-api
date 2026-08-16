import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';

export class CryptoUtil {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hashes a plain password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifies a plain password against a bcrypt hash
   */
  static async comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  /**
   * Generates a secure raw API key for IoT devices: betty_live_<random32>
   */
  static generateApiKey(): { rawKey: string; keyHash: string; prefix: string } {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `betty_live_${randomHex}`;
    const prefix = rawKey.substring(0, 16);
    const keyHash = this.hashSha256(rawKey);
    return { rawKey, keyHash, prefix };
  }

  /**
   * Hashes any token with SHA-256 for secure DB lookup
   */
  static hashSha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Generates a readable 8-char invite code for teams
   */
  static generateTeamCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generates a 32-byte secure token for invite links & password resets
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

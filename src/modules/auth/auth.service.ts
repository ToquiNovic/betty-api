import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { passwordResetTokens } from '../../database/schema/password-resets.schema';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { UserEntity } from '../users/domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../users/domain/ports/user.repository.port';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './application/dtos/auth-actions.dto';
import { RegisterDto } from './application/dtos/register.dto';
import { JwtPayload } from './infrastructure/strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('auth.user_exists');
    }

    const passwordHash = await CryptoUtil.hashPassword(dto.password);
    const user = await this.userRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      authProvider: 'email',
      emailVerified: false,
    });

    const tokens = await this.generateTokens(user);
    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const isMatch = await CryptoUtil.comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async googleLogin(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    let user = await this.userRepository.findByGoogleId(profile.googleId);

    if (!user) {
      // Check if user exists with the same email
      user = await this.userRepository.findByEmail(profile.email);
      if (user) {
        // Link google ID to existing account
        user = await this.userRepository.update(user.id, {
          googleId: profile.googleId,
          avatarUrl: user.avatarUrl || profile.avatarUrl,
        });
      } else {
        // Create new user
        user = await this.userRepository.create({
          email: profile.email,
          name: profile.name || 'Google User',
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          authProvider: 'google',
          emailVerified: true,
        });
      }
    }

    const tokens = await this.generateTokens(user);
    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      // For security reasons, don't reveal whether the email exists
      return { message: 'auth.password_reset_sent' };
    }

    const rawToken = CryptoUtil.generateSecureToken();
    const tokenHash = CryptoUtil.hashSha256(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      isUsed: false,
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.name, rawToken);

    return { message: 'auth.password_reset_sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = CryptoUtil.hashSha256(dto.token);

    const [resetRecord] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!resetRecord || resetRecord.isUsed || new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('auth.invalid_token');
    }

    const newPasswordHash = await CryptoUtil.hashPassword(dto.newPassword);
    await this.userRepository.update(resetRecord.userId, {
      passwordHash: newPasswordHash,
    });

    await this.db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    // Revoke cached tokens in Dragonfly
    await this.cacheService.delPattern(`refresh_token:${resetRecord.userId}:*`);

    return { message: 'auth.password_changed' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      });

      const cachedUserId = await this.cacheService.get(`refresh_token:${payload.sub}:${payload.tokenId}`);
      if (!cachedUserId) {
        throw new UnauthorizedException('auth.unauthorized');
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('auth.user_not_found');
      }

      // Invalidate old refresh token
      await this.cacheService.del(`refresh_token:${payload.sub}:${payload.tokenId}`);

      // Generate new tokens
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('auth.unauthorized');
    }
  }

  private async generateTokens(user: UserEntity) {
    const tokenId = CryptoUtil.generateSecureToken();
    const payload: JwtPayload & { tokenId: string } = {
      sub: user.id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      tokenId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.jwtSecret'),
        expiresIn: (this.configService.get<string>('auth.jwtExpiresIn') || '1d') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: (this.configService.get<string>('auth.jwtRefreshExpiresIn') || '7d') as any,
      }),
    ]);

    // Store refresh token in Dragonfly with 7 days TTL (604800 seconds)
    await this.cacheService.set(`refresh_token:${user.id}:${tokenId}`, user.id, 604800);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('auth.jwtExpiresIn', '1d'),
    };
  }
}

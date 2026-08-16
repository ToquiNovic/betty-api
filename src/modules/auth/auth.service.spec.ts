import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DRIZZLE_ORM } from '../../database/drizzle.provider';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { UserEntity } from '../users/domain/entities/user.entity';
import { USER_REPOSITORY } from '../users/domain/ports/user.repository.port';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockJwtService: any;
  let mockCacheService: any;
  let mockEmailService: any;
  let mockDb: any;

  beforeEach(async () => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_token'),
      verify: jest.fn(),
    };

    mockCacheService = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    mockEmailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue([]),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'auth.jwtSecret') return 'test_secret';
              if (key === 'auth.jwtRefreshSecret') return 'test_refresh_secret';
              if (key === 'auth.jwtExpiresIn') return '1d';
              if (key === 'auth.jwtRefreshExpiresIn') return '7d';
              return def;
            }),
          },
        },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register a new user successfully', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue(
      new UserEntity({
        id: 'user-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        authProvider: 'email',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.register({
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    });

    expect(result).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBe('mock_token');
    expect(mockCacheService.set).toHaveBeenCalled();
  });

  it('should throw ConflictException if user already exists on register', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(
      new UserEntity({ id: 'user-uuid-1', email: 'test@example.com', name: 'Test' }),
    );

    await expect(
      service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should login valid credentials and return tokens', async () => {
    const passwordHash = await CryptoUtil.hashPassword('secret123');
    mockUserRepo.findByEmail.mockResolvedValue(
      new UserEntity({
        id: 'user-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        authProvider: 'email',
        emailVerified: true,
      }),
    );

    const result = await service.login({
      email: 'test@example.com',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('mock_token');
    expect(result.refreshToken).toBe('mock_token');
  });

  it('should throw UnauthorizedException on invalid password', async () => {
    const passwordHash = await CryptoUtil.hashPassword('secret123');
    mockUserRepo.findByEmail.mockResolvedValue(
      new UserEntity({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash,
      }),
    );

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

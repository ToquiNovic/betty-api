import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE_ORM } from '../../database/drizzle.provider';
import { CacheService } from '../cache/cache.service';
import { TeamsService } from '../teams/teams.service';
import { SensorsService } from './sensors.service';

describe('SensorsService', () => {
  let service: SensorsService;
  let mockDb: any;
  let mockTeamsService: any;
  let mockCacheService: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'sensor-123',
              name: 'DHT22 Sensor',
              ownerId: 'user-1',
              teamId: null,
              apiKeyPrefix: 'betty_live_1234',
              apiKeyHash: 'hash',
              mqttTopic: 'pending',
              status: 'active',
              metadata: {},
            },
          ]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'sensor-123' }]),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sensor-123' }]),
        }),
      }),
    };

    mockTeamsService = {
      verifyMembership: jest.fn().mockResolvedValue(true),
      verifyRole: jest.fn().mockResolvedValue('owner'),
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should create a sensor and return raw API key once', async () => {
    const result = await service.createSensor('user-1', {
      name: 'DHT22 Sensor',
      description: 'Lab test',
    });

    expect(result).toBeDefined();
    expect(result.rawApiKey).toMatch(/^betty_live_/);
    expect(result.mqttTopic).toBe('betty/sensor/sensor-123/data');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should rotate sensor API key and return new key', async () => {
    jest.spyOn(service, 'verifySensorOwnerOrAdmin').mockResolvedValue({
      id: 'sensor-123',
      ownerId: 'user-1',
    } as any);

    const result = await service.rotateApiKey('sensor-123', 'user-1');

    expect(result).toBeDefined();
    expect(result.rawApiKey).toMatch(/^betty_live_/);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

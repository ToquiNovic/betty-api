import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;
  private subscriberClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('cache.host', 'localhost');
    const port = this.configService.get<number>('cache.port', 6379);
    const password = this.configService.get<string>('cache.password');

    const redisOptions = {
      host,
      port,
      password: password || undefined,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(redisOptions);
    this.subscriberClient = new Redis(redisOptions);

    this.client.connect().then(() => {
      this.logger.log(`Dragonfly cache connected at ${host}:${port}`);
    }).catch((err) => {
      this.logger.warn(`Dragonfly cache connection deferred: ${err.message}`);
    });

    this.subscriberClient.connect().then(() => {
      this.logger.log(`Dragonfly Pub/Sub subscriber connected`);
    }).catch((err) => {
      this.logger.warn(`Dragonfly subscriber connection deferred: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
    }
  }

  // --- Key-Value Cache Operations ---

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Error reading key ${key} from cache: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key} in cache: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from cache: ${error.message}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern} from cache: ${error.message}`);
    }
  }

  // --- Pub/Sub Operations ---

  async publish(channel: string, message: any): Promise<number> {
    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.client.publish(channel, payload);
    } catch (error) {
      this.logger.error(`Error publishing to channel ${channel}: ${error.message}`);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (channel: string, message: string) => void): Promise<void> {
    try {
      await this.subscriberClient.subscribe(channel);
      this.subscriberClient.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(ch, msg);
        }
      });
    } catch (error) {
      this.logger.error(`Error subscribing to channel ${channel}: ${error.message}`);
    }
  }

  async psubscribe(pattern: string, callback: (pattern: string, channel: string, message: string) => void): Promise<void> {
    try {
      await this.subscriberClient.psubscribe(pattern);
      this.subscriberClient.on('pmessage', (pat, ch, msg) => {
        if (pat === pattern) {
          callback(pat, ch, msg);
        }
      });
    } catch (error) {
      this.logger.error(`Error pattern-subscribing to ${pattern}: ${error.message}`);
    }
  }

  getClient(): Redis {
    return this.client;
  }
}

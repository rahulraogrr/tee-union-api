import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin Redis wrapper used for:
 *   1. JWT token blacklist (logout / revocation)
 *   2. Login attempt counters (account lockout)
 *
 * The service connects lazily so the app starts even when Redis is unavailable.
 * All methods fail silently and log errors — callers must handle null returns.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host:     this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port:     this.config.get<number>('REDIS_PORT') ?? 6379,
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 0,   // fail fast — don't hang login when Redis is down
      connectTimeout: 2000,      // 2 s connection timeout
      commandTimeout: 1000,      // 1 s per-command timeout
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  // ── Token Blacklist ────────────────────────────────────────────────────────

  /**
   * Blacklist a JWT token until its natural expiry.
   *
   * @param jti  - JWT token ID (jti claim) or full token hash
   * @param ttlSeconds - remaining lifetime in seconds (should match token exp)
   */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(`bl:${jti}`, '1', 'EX', ttlSeconds);
    } catch (err) {
      this.logger.error(`blacklistToken failed: ${err}`);
    }
  }

  /**
   * Returns true if the token has been blacklisted (logged out).
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const val = await this.client.get(`bl:${jti}`);
      return val === '1';
    } catch (err) {
      this.logger.error(`isTokenBlacklisted failed: ${err}`);
      return false; // fail open — don't block legitimate users if Redis is down
    }
  }

  // ── Login Attempt Tracking ─────────────────────────────────────────────────

  /** Max failed attempts before account is temporarily locked */
  static readonly MAX_ATTEMPTS = 5;
  /** Lockout duration in seconds (15 minutes) */
  static readonly LOCKOUT_TTL  = 900;

  private attemptKey(employeeId: string) { return `login_attempts:${employeeId}`; }
  private lockKey(employeeId: string)    { return `login_locked:${employeeId}`; }

  /** Returns true if the account is currently locked out */
  async isLockedOut(employeeId: string): Promise<boolean> {
    try {
      return (await this.client.exists(this.lockKey(employeeId))) === 1;
    } catch {
      return false;
    }
  }

  /**
   * Increments the failed-attempt counter.
   * Locks the account for LOCKOUT_TTL seconds when MAX_ATTEMPTS is reached.
   */
  async recordFailedAttempt(employeeId: string): Promise<void> {
    try {
      const key = this.attemptKey(employeeId);
      const attempts = await this.client.incr(key);
      // Set TTL on first attempt so the key auto-expires
      if (attempts === 1) {
        await this.client.expire(key, RedisService.LOCKOUT_TTL);
      }
      if (attempts >= RedisService.MAX_ATTEMPTS) {
        await this.client.set(this.lockKey(employeeId), '1', 'EX', RedisService.LOCKOUT_TTL);
        await this.client.del(key);
        this.logger.warn(`Account locked out after ${attempts} failed attempts: ${employeeId}`);
      }
    } catch (err) {
      this.logger.error(`recordFailedAttempt failed: ${err}`);
    }
  }

  /** Clears failed-attempt counter after successful login */
  async clearFailedAttempts(employeeId: string): Promise<void> {
    try {
      await this.client.del(this.attemptKey(employeeId), this.lockKey(employeeId));
    } catch (err) {
      this.logger.error(`clearFailedAttempts failed: ${err}`);
    }
  }
}

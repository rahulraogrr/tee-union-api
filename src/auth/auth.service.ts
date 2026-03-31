import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';

// JWT lifetime: 2 hours (was 7 days — OWASP A07 fix)
const JWT_TTL_SECONDS = 2 * 60 * 60; // 7200 s
const JWT_EXPIRY      = '2h';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private redis:   RedisService,
  ) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------
  /**
   * Validates `employeeId` + `pin` (or one-time PIN) and returns a signed JWT.
   * Implements account lockout after {@link RedisService.MAX_ATTEMPTS} failures.
   *
   * @returns `accessToken` (2-hour JWT), `requiresPinChange` flag, role, employeeId
   * @throws ForbiddenException  when account is temporarily locked (OWASP A07)
   * @throws UnauthorizedException when credentials are invalid or account inactive
   */
  async login(dto: LoginDto) {
    // ── Account lockout check (OWASP A07) ───────────────────────────────────
    if (await this.redis.isLockedOut(dto.employeeId)) {
      this.logger.warn(`Login blocked — account locked: ${dto.employeeId}`);
      throw new ForbiddenException(
        `Account temporarily locked due to too many failed attempts. ` +
        `Try again in ${RedisService.LOCKOUT_TTL / 60} minutes.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { employeeId: dto.employeeId },
      include: { member: { select: { firstName: true, lastName: true } } },
    });

    if (!user || !user.isActive) {
      // Record attempt even for unknown IDs — prevents timing-based user enumeration
      await this.redis.recordFailedAttempt(dto.employeeId);
      this.logger.warn(`Login failed — unknown or inactive employeeId: ${dto.employeeId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashToCheck = user.oneTimePinHash ?? user.pinHash;
    const isValid = await bcrypt.compare(dto.pin, hashToCheck);

    if (!isValid) {
      await this.redis.recordFailedAttempt(dto.employeeId);
      this.logger.warn(`Login failed — wrong PIN for employeeId: ${dto.employeeId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // ── Success path ─────────────────────────────────────────────────────────
    await Promise.all([
      this.redis.clearFailedAttempts(dto.employeeId),
      this.prisma.user.update({
        where: { id: user.id },
        data:  { lastLoginAt: new Date() },
      }),
    ]);

    const isFirstLogin = !!user.oneTimePinHash;
    this.logger.log(
      `Login success — employeeId: ${user.employeeId}, roles: [${user.roles.join(', ')}]` +
        (isFirstLogin ? ' [first login]' : ''),
    );

    const { token } = this.signToken(user.id, user.employeeId, user.roles);

    return {
      accessToken:       token,
      requiresPinChange: !user.isPinChanged,
      roles:             user.roles,
      employeeId:        user.employeeId,
    };
  }

  // ---------------------------------------------------------------------------
  // LOGOUT  (OWASP A07 — token revocation)
  // ---------------------------------------------------------------------------
  /**
   * Blacklists the current JWT so it cannot be reused even before its 2-hour expiry.
   * The JwtStrategy checks this blacklist on every authenticated request.
   *
   * @param jti       - Unique token identifier (jti claim) from the JWT payload
   * @param expiresAt - Token expiry Unix timestamp (seconds) from JWT `exp` claim
   */
  async logout(jti: string, expiresAt: number): Promise<{ message: string }> {
    const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    await this.redis.blacklistToken(jti, ttl);
    this.logger.log(`Token revoked — jti: ${jti}, remaining ttl: ${ttl}s`);
    return { message: 'Logged out successfully' };
  }

  // ---------------------------------------------------------------------------
  // CHANGE PIN
  // ---------------------------------------------------------------------------
  /**
   * Verifies the current (or one-time) PIN and replaces it with a new one.
   * Sets `isPinChanged = true` and clears `oneTimePinHash` on success.
   *
   * @throws BadRequestException when the current PIN is wrong or new PIN equals old PIN
   */
  async changePin(userId: string, dto: ChangePinDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const hashToCheck = user.oneTimePinHash ?? user.pinHash;
    const isValid = await bcrypt.compare(dto.currentPin, hashToCheck);

    if (!isValid) {
      this.logger.warn(`PIN change failed — wrong current PIN for userId: ${userId}`);
      throw new BadRequestException('Current PIN is incorrect');
    }

    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException('New PIN must be different from current PIN');
    }

    const newHash = await bcrypt.hash(dto.newPin, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pinHash:        newHash,
        oneTimePinHash: null,
        isPinChanged:   true,
      },
    });

    this.logger.log(`PIN changed successfully for userId: ${userId}`);
    return { message: 'PIN changed successfully' };
  }

  // ---------------------------------------------------------------------------
  // TOKEN HELPER
  // ---------------------------------------------------------------------------
  /**
   * Signs a JWT with a 2-hour expiry.
   * Includes a `jti` (JWT ID) unique per-token for revocation support.
   */
  signToken(userId: string, employeeId: string, roles: string[]): { token: string; jti: string } {
    const jti   = `${userId}-${Date.now()}`;
    const token = this.jwt.sign(
      { sub: userId, employeeId, roles, jti },
      { expiresIn: JWT_EXPIRY },
    );
    return { token, jti };
  }

  static get jwtTtlSeconds() { return JWT_TTL_SECONDS; }
}

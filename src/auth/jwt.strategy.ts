import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
    private redis:   RedisService,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; employeeId: string; role: string; jti?: string; exp: number }) {
    // ── Token blacklist check (OWASP A07 — revocation support) ──────────────
    if (payload.jti && await this.redis.isTokenBlacklisted(payload.jti)) {
      this.logger.warn(`JWT rejected — blacklisted token jti: ${payload.jti}`);
      throw new UnauthorizedException('Token has been revoked');
    }

    // ── User status check ────────────────────────────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id:           true,
        employeeId:   true,
        role:         true,
        isActive:     true,
        isPinChanged: true,
      },
    });

    if (!user) {
      this.logger.warn(`JWT rejected — user not found for sub: ${payload.sub}`);
      throw new UnauthorizedException('Account not found');
    }

    if (!user.isActive) {
      this.logger.warn(`JWT rejected — inactive account: ${user.employeeId} (id: ${user.id})`);
      throw new UnauthorizedException('Account is inactive');
    }

    // Attach exp so the logout endpoint can compute remaining TTL
    return { ...user, exp: payload.exp, jti: payload.jti };
  }
}

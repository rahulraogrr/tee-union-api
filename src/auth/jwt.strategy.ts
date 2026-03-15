import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; employeeId: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        employeeId: true,
        role: true,
        isActive: true,
        isPinChanged: true,
      },
    });

    if (!user) {
      this.logger.warn(`JWT rejected — user not found for sub: ${payload.sub}`);
      throw new UnauthorizedException('Account is inactive or not found');
    }

    if (!user.isActive) {
      this.logger.warn(`JWT rejected — inactive account: ${user.employeeId} (id: ${user.id})`);
      throw new UnauthorizedException('Account is inactive or not found');
    }

    return user;
  }
}

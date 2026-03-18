import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// RedisService is provided globally via RedisModule (@Global) — no local import needed

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_SECRET'),
        // SECURITY (OWASP A07): Reduced from 7d → 2h to limit exposure window
        signOptions: { expiresIn: '2h' },
      }),
    }),
  ],
  providers:   [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports:     [AuthService],
})
export class AuthModule {}

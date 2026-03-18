import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginResponseDto, OkResponseDto } from '../common/swagger/responses';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------
  /** 5 attempts per 15 minutes per IP — brute-force protection */
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with employee ID and 4-digit PIN',
    description:
      'Validates the employee ID + PIN and returns a signed JWT (2-hour lifetime).\n\n' +
      'Account is **temporarily locked for 15 minutes** after 5 consecutive failures.\n\n' +
      'If `mustChangePin` is `true` the user **must** call `POST /auth/change-pin` before ' +
      'using any other endpoint.',
  })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid employee ID or PIN' })
  @ApiForbiddenResponse({ description: 'Account locked — too many failed attempts' })
  @ApiBadRequestResponse({ description: 'Validation error — PIN must be exactly 4 digits' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded — try again in 15 minutes' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ---------------------------------------------------------------------------
  // LOGOUT  (OWASP A07 — token revocation)
  // ---------------------------------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout — revoke the current JWT',
    description:
      'Adds the current JWT to a Redis blacklist so it cannot be reused ' +
      'even before its natural 2-hour expiry. ' +
      'The client must discard the token after calling this endpoint.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'Token revoked, logout successful' })
  @ApiUnauthorizedResponse({ description: 'No valid token provided' })
  async logout(@Req() req: Request & { user: { id: string } }) {
    // Extract jti and exp from the raw Authorization header JWT
    const token = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    let jti: string | undefined;
    let exp: number | undefined;

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
      );
      jti = payload.jti as string | undefined;
      exp = payload.exp as number | undefined;
    } catch {
      // Malformed token — JWT guard already validated it, so this should never happen
    }

    if (!jti || !exp) {
      // Token was issued before jti support — still OK, just can't blacklist precisely
      return { message: 'Logged out successfully' };
    }

    return this.authService.logout(jti, exp);
  }

  // ---------------------------------------------------------------------------
  // CHANGE PIN
  // ---------------------------------------------------------------------------
  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Change your 4-digit PIN',
    description:
      'Requires the current PIN and a new PIN. ' +
      'Must be called after first login when `mustChangePin` is `true`.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'PIN changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Current PIN is incorrect' })
  @ApiBadRequestResponse({ description: 'New PIN must be exactly 4 numeric digits' })
  changePin(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePinDto,
  ) {
    return this.authService.changePin(userId, dto);
  }
}

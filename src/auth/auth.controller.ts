import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

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

  /**
   * Public endpoint — no token required.
   * Returns a JWT access token and a `mustChangePin` flag (true on first login).
   */
  // 5 attempts per 15 minutes per IP — brute-force protection
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts — try again in 15 minutes' })
  @ApiOperation({
    summary: 'Login with employee ID and 4-digit PIN',
    description:
      'Validates the employee ID + PIN and returns a signed JWT.\n\n' +
      'If `mustChangePin` is `true` the user **must** call `POST /auth/change-pin` before ' +
      'using any other endpoint.',
  })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid employee ID or PIN' })
  @ApiBadRequestResponse({ description: 'Validation error — PIN must be exactly 4 digits' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Allows a member to change their PIN.
   * The old PIN (or one-time PIN assigned by admin) must be supplied.
   */
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

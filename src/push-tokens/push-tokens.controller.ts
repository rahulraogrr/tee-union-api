import { Controller, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { PushTokensService } from './push-tokens.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OkResponseDto } from '../common/swagger/responses';

@ApiTags('Push Tokens')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  /**
   * Called by the mobile app immediately after it receives a new FCM token
   * from the Firebase SDK (on install, re-install, or OS token rotation).
   * Re-registering the same token is safe — it is idempotent.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a device push token',
    description:
      'Call this immediately after the Firebase SDK delivers a new registration token. ' +
      'Safe to call multiple times with the same token (idempotent upsert).',
  })
  @ApiCreatedResponse({ type: OkResponseDto, description: 'Token registered' })
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.pushTokensService.register(userId, dto.token, dto.platform);
  }

  /**
   * Removes a specific token — call when the user logs out on one device.
   * The token string is passed in the request body rather than as a URL param
   * because FCM tokens can be very long (up to 4 KB).
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister a specific device push token',
    description: 'Call on single-device logout or when the app detects its token has been revoked.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'Token removed (or was not found)' })
  unregister(
    @CurrentUser('id') userId: string,
    @Body() dto: Pick<RegisterTokenDto, 'token'>,
  ) {
    return this.pushTokensService.unregister(userId, dto.token);
  }

  /**
   * Removes all push tokens for the current user across all their devices.
   * Call on logout-all-devices or account deactivation.
   */
  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister all push tokens for the current user',
    description: 'Clears every device token. Push notifications will stop for all devices.',
  })
  @ApiOkResponse({ description: '{ ok: true, removed: <count> }' })
  unregisterAll(@CurrentUser('id') userId: string) {
    return this.pushTokensService.unregisterAll(userId);
  }
}

import {
  Controller, Post, Body, Headers, HttpCode, HttpStatus,
  Logger, UnauthorizedException, Get,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TelegramLinkService } from './telegram-link.service';
import {
  OkResponseDto,
  TelegramLinkTokenDto,
  TelegramStatusDto,
} from '../common/swagger/responses';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly linkService: TelegramLinkService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Called by Telegram servers when a message is sent to the bot.
   * Validates the HMAC-SHA256 secret before processing the update.
   * This endpoint is public and does not require a JWT.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Telegram webhook (called by Telegram servers only)',
    description:
      'Receives bot updates from Telegram. ' +
      'The `x-telegram-bot-api-secret-token` header is verified against `TELEGRAM_WEBHOOK_SECRET`. ' +
      'This endpoint should be whitelisted from JWT guard but protected by the HMAC secret.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'Update acknowledged' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing webhook secret' })
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') secret: string,
  ): Promise<OkResponseDto> {
    const expectedSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');

    if (expectedSecret) {
      const expected = crypto
        .createHmac('sha256', expectedSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (secret !== expected) {
        this.logger.warn('Telegram webhook received with invalid secret');
        throw new UnauthorizedException('Invalid webhook secret');
      }
    }

    this.logger.debug('Telegram webhook update received');
    return { ok: true };
  }

  /**
   * Generates a one-time 8-character alphanumeric token (valid 10 minutes).
   * The user sends `/link <token>` to the Telegram bot to connect their account.
   */
  @Post('link-token')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Generate a one-time Telegram link token',
    description:
      'Returns a short-lived token and instructions. ' +
      'The user sends `/link <token>` to the bot in Telegram to link their account.',
  })
  @ApiCreatedResponse({ type: TelegramLinkTokenDto, description: 'Link token generated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async generateLinkToken(
    @CurrentUser() user: { id: string },
  ): Promise<TelegramLinkTokenDto> {
    return this.linkService.generateLinkToken(user.id);
  }

  /**
   * Removes the Telegram account link from the current user.
   * Future Telegram fallback notifications will no longer be sent.
   */
  @Post('unlink')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Unlink Telegram from your account',
    description: 'Clears the stored Telegram chat ID. Fallback notifications via Telegram will stop.',
  })
  @ApiOkResponse({ type: OkResponseDto, description: 'Telegram unlinked' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async unlinkTelegram(@CurrentUser() user: { id: string }): Promise<OkResponseDto> {
    await this.linkService.unlinkTelegram(user.id);
    return { ok: true };
  }

  /**
   * Returns whether the current user has a Telegram account linked.
   */
  @Get('status')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Check if Telegram is linked for the current user',
  })
  @ApiOkResponse({ type: TelegramStatusDto, description: 'Telegram link status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async getLinkStatus(
    @CurrentUser() user: { id: string; telegramChatId?: bigint | null },
  ): Promise<TelegramStatusDto> {
    return { linked: !!user.telegramChatId };
  }
}

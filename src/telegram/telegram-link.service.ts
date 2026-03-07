import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import * as crypto from 'crypto';

@Injectable()
export class TelegramLinkService {
  private readonly logger = new Logger(TelegramLinkService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // ---------------------------------------------------------------------------
  // Generate a one-time link token for a user (called from app after login)
  // ---------------------------------------------------------------------------
  async generateLinkToken(userId: string): Promise<{ token: string; instructions: string }> {
    // Expire any existing tokens for this user by setting expiresAt to now
    await this.prisma.telegramLinkToken.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const token = this.randomToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.telegramLinkToken.create({
      data: { userId, token, expiresAt },
    });

    const botUsername = await this.getBotUsername();
    const instructions =
      `Open Telegram and message @${botUsername}:\n\n` +
      `/link ${token}\n\n` +
      `This token expires in 10 minutes and can only be used once.`;

    return { token, instructions };
  }

  // ---------------------------------------------------------------------------
  // Handle /link <token> command received from Telegram
  // ---------------------------------------------------------------------------
  async handleLinkCommand(chatId: bigint, token: string): Promise<void> {
    const record = await this.prisma.telegramLinkToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, telegramChatId: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      await this.telegram.sendMessage(
        chatId,
        '❌ Invalid or expired token. Please generate a new one from the TEE Union app.',
      );
      return;
    }

    if (record.user.telegramChatId && record.user.telegramChatId !== chatId) {
      await this.telegram.sendMessage(
        chatId,
        '⚠️ This account is already linked to a different Telegram account. Please contact your union admin.',
      );
      return;
    }

    // Mark token as used and link the chat ID
    await this.prisma.$transaction([
      this.prisma.telegramLinkToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          telegramChatId: chatId,
          telegramLinkedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Telegram linked for user ${record.userId} → chatId ${chatId}`);

    await this.telegram.sendMessage(
      chatId,
      '✅ Your Telegram account is now linked to TEE 1104 Union!\n\n' +
        'You will receive notifications here when the app cannot reach you.\n\n' +
        'To unlink, go to Settings in the TEE Union app.',
    );
  }

  // ---------------------------------------------------------------------------
  // Unlink Telegram from a user account (called from app)
  // ---------------------------------------------------------------------------
  async unlinkTelegram(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramLinkedAt: null },
    });

    if (user.telegramChatId) {
      await this.telegram.sendMessage(
        user.telegramChatId,
        '🔓 Your Telegram account has been unlinked from TEE 1104 Union.\n\n' +
          'You will no longer receive notifications here.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Register the Telegram bot's /link command listener
  // ---------------------------------------------------------------------------
  registerCommandHandlers(): void {
    if (!this.telegram.isEnabled()) return;

    const bot = this.telegram.getBot();

    bot.onText(/^\/link\s+(\S+)$/, async (msg, match) => {
      const chatId = BigInt(msg.chat.id);
      const token = match?.[1] ?? '';
      this.logger.log(`/link command received from chatId ${chatId}`);
      await this.handleLinkCommand(chatId, token);
    });

    bot.onText(/^\/start$/, async (msg) => {
      await this.telegram.sendMessage(
        msg.chat.id,
        'Welcome to TEE 1104 Union Bot! 👷\n\n' +
          'To link your account, open the TEE Union app and go to:\n' +
          'Settings → Telegram Notifications → Link Account\n\n' +
          'You will receive a one-time token to enter here.',
      );
    });

    this.logger.log('Telegram command handlers registered ✅');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  private randomToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.randomBytes(8))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  private async getBotUsername(): Promise<string> {
    try {
      const me = await this.telegram.getBot().getMe();
      return me.username ?? 'tee1104unionbot';
    } catch {
      return 'tee1104unionbot';
    }
  }
}

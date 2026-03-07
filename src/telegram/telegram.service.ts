import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;
  private enabled = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN not configured — Telegram notifications disabled.',
      );
      return;
    }

    // Use webhook mode in production, polling in dev
    const isDev = this.config.get('NODE_ENV') !== 'production';
    this.bot = new TelegramBot(token, { polling: isDev });
    this.enabled = true;
    this.logger.log(`Telegram bot initialised (${isDev ? 'polling' : 'webhook'}) ✅`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  // ---------------------------------------------------------------------------
  // Send a plain notification message to a member
  // ---------------------------------------------------------------------------
  async sendNotification(
    chatId: bigint,
    title: string,
    body: string,
  ): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const text =
        `📢 *${this.escape(title)}*\n\n` +
        `${this.escape(body)}\n\n` +
        `_Open the TEE 1104 Union app for details\\._`;

      await this.bot.sendMessage(chatId.toString(), text, {
        parse_mode: 'MarkdownV2',
      });
      return true;
    } catch (err) {
      this.logger.error(`Telegram send failed for chatId ${chatId}`, err);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Send a message by chatId (raw, for link flow responses)
  // ---------------------------------------------------------------------------
  async sendMessage(chatId: number | bigint, text: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.bot.sendMessage(chatId.toString(), text);
    } catch (err) {
      this.logger.error(`Telegram sendMessage failed`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Escape special chars for MarkdownV2
  // ---------------------------------------------------------------------------
  private escape(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}

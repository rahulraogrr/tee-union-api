import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
export declare class TelegramService implements OnModuleInit {
    private config;
    private readonly logger;
    private bot;
    private enabled;
    constructor(config: ConfigService);
    onModuleInit(): void;
    isEnabled(): boolean;
    getBot(): TelegramBot;
    sendNotification(chatId: bigint, title: string, body: string): Promise<boolean>;
    sendMessage(chatId: number | bigint, text: string): Promise<void>;
    private escape;
}

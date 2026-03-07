import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class SmsService implements OnModuleInit {
    private config;
    private readonly logger;
    private client;
    private senderId;
    private enabled;
    constructor(config: ConfigService);
    onModuleInit(): void;
    isEnabled(): boolean;
    sendSms(phoneNumber: string, message: string): Promise<boolean>;
    formatNotification(title: string, body: string): string;
}

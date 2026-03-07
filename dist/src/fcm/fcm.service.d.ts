import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface FcmPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}
export declare class FcmService implements OnModuleInit {
    private config;
    private readonly logger;
    private app;
    private enabled;
    constructor(config: ConfigService);
    onModuleInit(): void;
    isEnabled(): boolean;
    sendToTokens(tokens: string[], payload: FcmPayload): Promise<boolean>;
}

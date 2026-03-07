import { ConfigService } from '@nestjs/config';
import { TelegramLinkService } from './telegram-link.service';
import { OkResponseDto, TelegramLinkTokenDto, TelegramStatusDto } from '../common/swagger/responses';
export declare class TelegramController {
    private readonly linkService;
    private readonly config;
    private readonly logger;
    constructor(linkService: TelegramLinkService, config: ConfigService);
    handleWebhook(body: Record<string, unknown>, secret: string): Promise<OkResponseDto>;
    generateLinkToken(user: {
        id: string;
    }): Promise<TelegramLinkTokenDto>;
    unlinkTelegram(user: {
        id: string;
    }): Promise<OkResponseDto>;
    getLinkStatus(user: {
        id: string;
        telegramChatId?: bigint | null;
    }): Promise<TelegramStatusDto>;
}

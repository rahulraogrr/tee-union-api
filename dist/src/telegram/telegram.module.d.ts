import { OnModuleInit } from '@nestjs/common';
import { TelegramLinkService } from './telegram-link.service';
export declare class TelegramModule implements OnModuleInit {
    private readonly linkService;
    constructor(linkService: TelegramLinkService);
    onModuleInit(): void;
}

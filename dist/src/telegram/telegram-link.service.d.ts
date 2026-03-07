import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
export declare class TelegramLinkService {
    private prisma;
    private telegram;
    private readonly logger;
    constructor(prisma: PrismaService, telegram: TelegramService);
    generateLinkToken(userId: string): Promise<{
        token: string;
        instructions: string;
    }>;
    handleLinkCommand(chatId: bigint, token: string): Promise<void>;
    unlinkTelegram(userId: string): Promise<void>;
    registerCommandHandlers(): void;
    private randomToken;
    private getBotUsername;
}

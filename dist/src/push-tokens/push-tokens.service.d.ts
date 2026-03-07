import { PrismaService } from '../prisma/prisma.service';
import { PlatformType } from '@prisma/client';
export declare class PushTokensService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    register(userId: string, token: string, platform: PlatformType): Promise<{
        ok: boolean;
    }>;
    unregister(userId: string, token: string): Promise<{
        ok: boolean;
    }>;
    unregisterAll(userId: string): Promise<{
        ok: boolean;
        removed: number;
    }>;
}

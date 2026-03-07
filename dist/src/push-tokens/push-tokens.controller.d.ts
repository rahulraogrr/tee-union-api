import { PushTokensService } from './push-tokens.service';
import { RegisterTokenDto } from './dto/register-token.dto';
export declare class PushTokensController {
    private readonly pushTokensService;
    constructor(pushTokensService: PushTokensService);
    register(userId: string, dto: RegisterTokenDto): Promise<{
        ok: boolean;
    }>;
    unregister(userId: string, dto: Pick<RegisterTokenDto, 'token'>): Promise<{
        ok: boolean;
    }>;
    unregisterAll(userId: string): Promise<{
        ok: boolean;
        removed: number;
    }>;
}

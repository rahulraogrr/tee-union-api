import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        requiresPinChange: boolean;
        role: import("@prisma/client").$Enums.UserRole;
        employeeId: string;
    }>;
    changePin(userId: string, dto: ChangePinDto): Promise<{
        message: string;
    }>;
}

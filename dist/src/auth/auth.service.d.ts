import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        requiresPinChange: boolean;
        role: import("@prisma/client").$Enums.UserRole;
        employeeId: string;
    }>;
    changePin(userId: string, dto: ChangePinDto): Promise<{
        message: string;
    }>;
    private signToken;
}

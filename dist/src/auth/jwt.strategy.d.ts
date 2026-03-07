import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    private config;
    constructor(prisma: PrismaService, config: ConfigService);
    validate(payload: {
        sub: string;
        employeeId: string;
        role: string;
    }): Promise<{
        employeeId: string;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        isPinChanged: boolean;
        isActive: boolean;
    }>;
}
export {};

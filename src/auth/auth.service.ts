import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------
  /**
   * Validates `employeeId` + `pin` (or one-time PIN) and returns a signed JWT.
   *
   * @param dto - Employee ID and 4-digit PIN
   * @returns `accessToken` (7-day JWT), `requiresPinChange` flag, role, and employeeId
   * @throws UnauthorizedException when credentials are invalid or the account is inactive
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { employeeId: dto.employeeId },
    });

    if (!user || !user.isActive) {
      this.logger.warn(`Login failed — unknown or inactive employeeId: ${dto.employeeId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashToCheck = user.oneTimePinHash ?? user.pinHash;
    const isValid = await bcrypt.compare(dto.pin, hashToCheck);

    if (!isValid) {
      this.logger.warn(`Login failed — wrong PIN for employeeId: ${dto.employeeId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const isFirstLogin = !!user.oneTimePinHash;
    this.logger.log(
      `Login success — employeeId: ${user.employeeId}, role: ${user.role}` +
        (isFirstLogin ? ' [first login]' : ''),
    );

    const token = this.signToken(user.id, user.employeeId, user.role);

    return {
      accessToken: token,
      requiresPinChange: !user.isPinChanged,
      role: user.role,
      employeeId: user.employeeId,
    };
  }

  // ---------------------------------------------------------------------------
  // CHANGE PIN
  // ---------------------------------------------------------------------------
  /**
   * Verifies the current (or one-time) PIN and replaces it with a new one.
   * Sets `isPinChanged = true` and clears `oneTimePinHash` on success.
   *
   * @param userId - ID of the authenticated user
   * @param dto - `currentPin` and `newPin` (must differ)
   * @throws BadRequestException when the current PIN is wrong or new PIN equals old PIN
   */
  async changePin(userId: string, dto: ChangePinDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const hashToCheck = user.oneTimePinHash ?? user.pinHash;
    const isValid = await bcrypt.compare(dto.currentPin, hashToCheck);

    if (!isValid) {
      this.logger.warn(`PIN change failed — wrong current PIN for userId: ${userId}`);
      throw new BadRequestException('Current PIN is incorrect');
    }

    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException('New PIN must be different from current PIN');
    }

    const newHash = await bcrypt.hash(dto.newPin, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pinHash: newHash,
        oneTimePinHash: null,
        isPinChanged: true,
      },
    });

    this.logger.log(`PIN changed successfully for userId: ${userId}`);
    return { message: 'PIN changed successfully' };
  }

  // ---------------------------------------------------------------------------
  // TOKEN HELPER
  // ---------------------------------------------------------------------------
  /**
   * Signs a JWT with a 7-day expiry containing `sub`, `employeeId`, and `role`.
   */
  private signToken(userId: string, employeeId: string, role: string) {
    return this.jwt.sign(
      { sub: userId, employeeId, role },
      { expiresIn: '7d' },
    );
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

// Mock bcrypt to avoid native binary issues in CI/test environments
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$hashed$new$pin'),
}));

import * as bcrypt from 'bcrypt';
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const activeUser = {
  id: 'user-1',
  employeeId: 'EMP-001',
  role: 'member',
  isActive: true,
  isPinChanged: true,
  pinHash: '$hashed$pin',
  oneTimePinHash: null,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ employeeId: 'EMP-001', pin: '1104' });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.requiresPinChange).toBe(false);
      expect(result.role).toBe('member');
      expect(result.employeeId).toBe('EMP-001');
    });

    it('throws UnauthorizedException for unknown employeeId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ employeeId: 'UNKNOWN', pin: '1234' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
      await expect(service.login({ employeeId: 'EMP-001', pin: '1104' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong PIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ employeeId: 'EMP-001', pin: '9999' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns requiresPinChange=true when isPinChanged=false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, isPinChanged: false });
      mockPrisma.user.update.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ employeeId: 'EMP-001', pin: '1104' });
      expect(result.requiresPinChange).toBe(true);
    });

    it('validates against oneTimePinHash when set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        oneTimePinHash: '$otp$hash',
        isPinChanged: false,
      });
      mockPrisma.user.update.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ employeeId: 'EMP-001', pin: '0000' });
      expect(result.accessToken).toBe('mock.jwt.token');
      // Should compare against oneTimePinHash not pinHash
      expect(mockBcrypt.compare).toHaveBeenCalledWith('0000', '$otp$hash');
    });

    it('updates lastLoginAt on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ employeeId: 'EMP-001', pin: '1104' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
    });
  });

  // ── CHANGE PIN ─────────────────────────────────────────────────────────────

  describe('changePin', () => {
    const user = {
      id: 'user-1',
      pinHash: '$hashed$pin',
      oneTimePinHash: null,
      isPinChanged: false,
    };

    it('changes PIN successfully', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.changePin('user-1', {
        currentPin: '1104',
        newPin: '5678',
      });

      expect(result.message).toBe('PIN changed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPinChanged: true,
            oneTimePinHash: null,
          }),
        }),
      );
    });

    it('throws BadRequestException for wrong current PIN', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePin('user-1', { currentPin: '9999', newPin: '5678' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new PIN equals current PIN', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePin('user-1', { currentPin: '1104', newPin: '1104' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates against oneTimePinHash when set', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        ...user, oneTimePinHash: '$otp$hash',
      });
      mockPrisma.user.update.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.changePin('user-1', { currentPin: '0000', newPin: '5678' });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('0000', '$otp$hash');
    });

    it('hashes new PIN before saving', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.changePin('user-1', { currentPin: '1104', newPin: '5678' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('5678', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pinHash: '$hashed$new$pin' }),
        }),
      );
    });
  });
});

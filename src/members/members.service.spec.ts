import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MaritalStatusType } from '@prisma/client';

const mockPrisma = {
  member: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockMember = {
  id: 'member-1',
  userId: 'user-1',
  fullName: 'Test Member',
  employeeId: 'EMP-001',
  isActive: true,
};

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();
  });

  // ── GET MY PROFILE ─────────────────────────────────────────────────────────

  describe('getMyProfile', () => {
    it('returns member profile', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      const result = await service.getMyProfile('user-1');
      expect(result).toEqual(mockMember);
      expect(mockPrisma.member.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(service.getMyProfile('unknown-user'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── FIND ALL ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated members', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockMember], 1]);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies district filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({ districtId: 'dist-1' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('calculates correct totalPages', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockMember], 45]);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.totalPages).toBe(3);
    });
  });

  // ── FIND ONE ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns member by id', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      const result = await service.findOne('member-1');
      expect(result).toEqual(mockMember);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── UPDATE MY PROFILE ──────────────────────────────────────────────────────

  describe('updateMyProfile', () => {
    it('updates profile successfully', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(mockMember);
      mockPrisma.member.update.mockResolvedValue({
        ...mockMember,
        maritalStatus: MaritalStatusType.married,
      });

      const result = await service.updateMyProfile('user-1', {
        maritalStatus: MaritalStatusType.married,
      });

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({ profileComplete: true }),
        }),
      );
      expect(result.maritalStatus).toBe(MaritalStatusType.married);
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(
        service.updateMyProfile('bad-user', { mobileNo: '9999999999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

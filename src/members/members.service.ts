import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MaritalStatusType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { clampLimit } from '../common/utils/pagination';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GET MY PROFILE
  // ---------------------------------------------------------------------------
  /**
   * Returns the full Prisma member record for the authenticated user,
   * including employer, designation, district, work unit, and user login info.
   *
   * @param userId - Authenticated user's ID
   * @throws NotFoundException when no member row is linked to this user
   */
  async getMyProfile(userId: string) {
    this.logger.debug(`Fetching profile for userId: ${userId}`);

    const member = await this.prisma.member.findUnique({
      where: { userId },
      include: {
        employer: { select: { id: true, name: true, shortName: true } },
        designation: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        workUnit: { select: { id: true, name: true, unitType: true } },
        user: { select: { employeeId: true, email: true, role: true, lastLoginAt: true } },
      },
    });

    if (!member) {
      this.logger.warn(`Member profile not found for userId: ${userId}`);
      throw new NotFoundException('Member profile not found');
    }

    return member;
  }

  // ---------------------------------------------------------------------------
  // LIST ALL MEMBERS (admin / rep)
  // ---------------------------------------------------------------------------
  /**
   * Returns a paginated, optionally filtered list of members.
   * Intended for admin and rep roles only (enforced at the controller level).
   *
   * @param filters - Optional districtId, employerId, designationId, isActive, page, limit
   */
  async findAll(filters: {
    districtId?: string;
    employerId?: string;
    designationId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { districtId, employerId, designationId, isActive, page = 1 } = filters;
    const limit = clampLimit(filters.limit);
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing members — page: ${page}, limit: ${limit}` +
        (districtId ? `, districtId: ${districtId}` : '') +
        (employerId ? `, employerId: ${employerId}` : ''),
    );

    const where = {
      ...(districtId && { districtId }),
      ...(employerId && { employerId }),
      ...(designationId && { designationId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        include: {
          employer: { select: { shortName: true } },
          designation: { select: { name: true } },
          district: { select: { name: true } },
          workUnit: { select: { name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // GET ONE MEMBER BY ID (admin / rep)
  // ---------------------------------------------------------------------------
  /**
   * Returns a single member's full record including designation history.
   *
   * @param id - Member UUID
   * @throws NotFoundException when no member with this ID exists
   */
  async findOne(id: string) {
    this.logger.debug(`Fetching member by id: ${id}`);

    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        employer: true,
        designation: true,
        district: true,
        workUnit: true,
        user: { select: { employeeId: true, email: true, mobileNo: true, role: true, isActive: true } },
        memberDesignationHistories: {
          include: {
            designation: { select: { name: true } },
            employer: { select: { shortName: true } },
          },
          orderBy: { validFrom: 'desc' },
        },
      },
    });

    if (!member) {
      this.logger.warn(`Member not found — id: ${id}`);
      throw new NotFoundException(`Member ${id} not found`);
    }

    return member;
  }

  // ---------------------------------------------------------------------------
  // UPDATE MY PROFILE (member self-service)
  // ---------------------------------------------------------------------------
  /**
   * Allows a member to update their residential address, mobile number, or marital status.
   * Sets `profileComplete = true` on the member row after any update.
   *
   * @param userId - Authenticated user's ID
   * @param data   - Partial update data (only provided fields are written)
   * @throws NotFoundException when no member row is linked to this user
   */
  async updateMyProfile(
    userId: string,
    data: {
      mobileNo?: string;
      currentAddress?: object;
      permanentAddress?: object;
      maritalStatus?: MaritalStatusType;
      marriageAnniversaryDate?: Date;
    },
  ) {
    const member = await this.prisma.member.findUnique({ where: { userId } });

    if (!member) {
      this.logger.warn(`Profile update failed — member not found for userId: ${userId}`);
      throw new NotFoundException('Member profile not found');
    }

    const fields = Object.keys(data).filter((k) => (data as any)[k] !== undefined);
    this.logger.log(`Profile updated for userId: ${userId} — fields: ${fields.join(', ')}`);

    return this.prisma.member.update({
      where: { userId },
      data: { ...data, profileComplete: true, updatedAt: new Date() },
    });
  }
}

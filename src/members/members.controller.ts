import {
  Controller, Get, Param, Query, Patch, Body, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam,
  ApiOkResponse, ApiNotFoundResponse, ApiForbiddenResponse, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { MembersService } from './members.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedMembersDto } from '../common/swagger/responses';

@ApiTags('Members')
@ApiBearerAuth('bearer')
@Controller('members')
export class MembersController {
  constructor(private membersService: MembersService) {}

  /**
   * Returns the full profile of the currently authenticated member,
   * including employment details, district, designation, and employer.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get my own member profile',
    description: 'Returns the full Prisma member record for the authenticated user.',
  })
  @ApiOkResponse({ description: 'Member profile returned' })
  @ApiNotFoundResponse({ description: 'No member record found for this user' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.membersService.getMyProfile(userId);
  }

  /**
   * Allows a member to self-update a limited set of fields:
   * residential address, mobile number, and marital status.
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Update my address, mobile number, or marital status',
    description: 'All fields are optional. Only provided fields are updated.',
  })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Validation error in supplied fields' })
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.membersService.updateMyProfile(userId, body);
  }

  /**
   * Paginated list of all members, filterable by district, employer, or designation.
   * Accessible only by admin-level roles and reps.
   */
  @Get()
  @Roles(UserRole.super_admin, UserRole.admin, UserRole.zonal_officer, UserRole.rep)
  @ApiOperation({
    summary: 'List all members (admin / rep only)',
    description: 'Supports filtering by districtId, employerId, designationId, and isActive.',
  })
  @ApiOkResponse({ type: PaginatedMembersDto, description: 'Paginated member list' })
  @ApiForbiddenResponse({ description: 'Caller role is not allowed to view all members' })
  @ApiQuery({ name: 'districtId',    required: false, description: 'Filter by district UUID' })
  @ApiQuery({ name: 'employerId',    required: false, description: 'Filter by employer UUID' })
  @ApiQuery({ name: 'designationId', required: false, description: 'Filter by designation UUID' })
  @ApiQuery({ name: 'isActive',      required: false, type: Boolean, description: 'Filter active/inactive members' })
  @ApiQuery({ name: 'page',          required: false, type: Number,  description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit',         required: false, type: Number,  description: 'Results per page (default: 20)' })
  findAll(@Query() query: any) {
    return this.membersService.findAll({
      districtId:    query.districtId,
      employerId:    query.employerId,
      designationId: query.designationId,
      isActive:      query.isActive !== undefined ? query.isActive === 'true' : undefined,
      page:          query.page  ? +query.page  : 1,
      limit:         query.limit ? +query.limit : 20,
    });
  }

  /**
   * Returns a single member's full profile by their UUID.
   * Accessible only by admin-level roles and reps.
   */
  @Get(':id')
  @Roles(UserRole.super_admin, UserRole.admin, UserRole.zonal_officer, UserRole.rep)
  @ApiOperation({
    summary: 'Get a single member by ID (admin / rep only)',
  })
  @ApiParam({ name: 'id', description: 'Member UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Member found and returned' })
  @ApiNotFoundResponse({ description: 'No member with this UUID' })
  @ApiForbiddenResponse({ description: 'Caller role is not permitted' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.findOne(id);
  }
}

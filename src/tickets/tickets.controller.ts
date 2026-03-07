import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam,
  ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse,
  ApiNotFoundResponse, ApiForbiddenResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedTicketsDto, MessageResponseDto } from '../common/swagger/responses';

@ApiTags('Tickets')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  /**
   * Creates a new grievance ticket on behalf of the authenticated member.
   * An in-app notification is dispatched immediately upon creation.
   */
  @Post()
  @Roles(UserRole.member)
  @ApiOperation({
    summary: 'Raise a new grievance ticket',
    description:
      'Only users with the **member** role can raise tickets. ' +
      'An automatic acknowledgement notification is sent after creation.',
  })
  @ApiCreatedResponse({ description: 'Ticket created — returns the full ticket object' })
  @ApiBadRequestResponse({ description: 'Validation error in request body' })
  @ApiForbiddenResponse({ description: 'Only members can create tickets' })
  create(@CurrentUser('id') userId: string, @Body() body: CreateTicketDto) {
    return this.ticketsService.create(userId, body);
  }

  /**
   * Returns a paginated list of tickets.
   * - **Members** see only their own tickets.
   * - **Reps** see tickets assigned to them.
   * - **Admins** see all tickets.
   */
  @Get()
  @ApiOperation({
    summary: 'List tickets (scoped by caller role)',
    description:
      'Members see their own tickets only. Reps see assigned tickets. Admins see all.',
  })
  @ApiOkResponse({ type: PaginatedTicketsDto, description: 'Paginated ticket list' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'in_progress', 'escalated', 'resolved', 'closed'], description: 'Filter by status' })
  @ApiQuery({ name: 'page',   required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit',  required: false, type: Number, description: 'Results per page (default: 20)' })
  findAll(
    @CurrentUser('id')   userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: any,
  ) {
    return this.ticketsService.findAll(userId, role, {
      status: query.status,
      page:   query.page  ? +query.page  : 1,
      limit:  query.limit ? +query.limit : 20,
    });
  }

  /**
   * Returns full ticket details including all public comments and status history.
   * Members can only access their own tickets.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get ticket details (members see own only)',
    description:
      'Returns ticket + comments + status history. ' +
      'Internal comments are hidden from members.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Full ticket object with comments and history' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiForbiddenResponse({ description: 'Member attempted to view another member\'s ticket' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id')   userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.ticketsService.findOne(id, userId, role);
  }

  /**
   * Adds a comment to a ticket.
   * Internal comments (`isInternal: true`) are visible only to reps and admins.
   */
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a comment to a ticket',
    description:
      'All roles may comment. Setting `isInternal: true` hides the comment from the ticket owner. ' +
      'The ticket owner is notified when a rep or admin posts a public comment.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Comment added and returned' })
  @ApiBadRequestResponse({ description: 'Validation error — comment too short/long' })
  @ApiForbiddenResponse({ description: 'Members cannot post internal comments' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id')   userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: AddCommentDto,
  ) {
    return this.ticketsService.addComment(id, userId, role, body.comment, body.isInternal);
  }

  /**
   * Updates the status of a ticket.
   * Only reps and admins can change ticket status.
   * The ticket owner receives a push/Telegram/SMS notification on every status change.
   */
  @Patch(':id/status')
  @Roles(UserRole.super_admin, UserRole.admin, UserRole.zonal_officer, UserRole.rep)
  @ApiOperation({
    summary: 'Update ticket status (rep / admin only)',
    description:
      'Valid transitions: open → in_progress → escalated → resolved → closed. ' +
      'An optional `notes` field is recorded in the status history.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID', format: 'uuid' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Status updated' })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  @ApiForbiddenResponse({ description: 'Only reps and admins can update ticket status' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, userId, body.status, body.notes);
  }
}

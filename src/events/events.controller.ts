import {
  Controller, Get, Post, Param, Query, Body,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam,
  ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse,
  ApiNotFoundResponse, ApiForbiddenResponse, ApiConflictResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedEventsDto } from '../common/swagger/responses';

@ApiTags('Events')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  /**
   * Returns upcoming published events ordered by date ascending.
   * Optionally filtered by district — the response includes both district-specific
   * and union-wide events.
   */
  @Get()
  @ApiOperation({
    summary: 'List upcoming published events',
    description:
      'Only events with `eventDate >= today` are returned. ' +
      'When `districtId` is provided, results include that district\'s events plus union-wide events.',
  })
  @ApiOkResponse({ type: PaginatedEventsDto, description: 'Paginated upcoming events list' })
  @ApiQuery({ name: 'districtId', required: false, description: 'Filter by district UUID' })
  @ApiQuery({ name: 'page',       required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit',      required: false, type: Number, description: 'Results per page (default: 20)' })
  findAll(
    @Query('districtId') districtId?: string,
    @Query('page')       page?: string,
    @Query('limit')      limit?: string,
  ) {
    return this.eventsService.findAll(districtId, page ? +page : 1, limit ? +limit : 20);
  }

  /**
   * Returns the full details of a single published event, including registration count.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get event details' })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Full event object with registration count' })
  @ApiNotFoundResponse({ description: 'Event not found or not yet published' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  /**
   * Registers the authenticated member for an event.
   * A confirmation notification is sent after successful registration.
   */
  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.member)
  @ApiOperation({
    summary: 'Register for an event (members only)',
    description:
      'Creates an event registration for the current member. ' +
      'Returns 409 if already registered or if the event is at full capacity.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Registration successful' })
  @ApiConflictResponse({ description: 'Already registered, or event is at full capacity' })
  @ApiNotFoundResponse({ description: 'Event or member profile not found' })
  @ApiForbiddenResponse({ description: 'Only members can register for events' })
  register(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.register(eventId, userId);
  }

  /**
   * Creates a new event. Setting `publish: true` immediately publishes the event
   * and broadcasts a notification to eligible active members.
   */
  @Post()
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({
    summary: 'Create an event (admin only)',
    description:
      'Set `districtId` to limit the event to one district; omit for a union-wide event. ' +
      'Set `publish: true` to immediately notify eligible members.',
  })
  @ApiCreatedResponse({ description: 'Event created — returns the full event object' })
  @ApiBadRequestResponse({ description: 'Validation error in request body' })
  @ApiForbiddenResponse({ description: 'Only super_admin and admin roles may create events' })
  create(@CurrentUser('id') userId: string, @Body() body: CreateEventDto) {
    return this.eventsService.create(userId, {
      ...body,
      eventDate: new Date(body.eventDate),
    });
  }
}

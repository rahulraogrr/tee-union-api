import {
  Controller, Get, Post, Patch, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam,
  ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse,
  ApiNotFoundResponse, ApiForbiddenResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedNewsDto, OkResponseDto } from '../common/swagger/responses';

@ApiTags('News')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  /**
   * Returns a paginated list of published news articles, newest first.
   * Available to all authenticated users.
   */
  @Get()
  @ApiOperation({
    summary: 'List published news articles',
    description: 'Returns published articles ordered by publication date descending.',
  })
  @ApiOkResponse({ type: PaginatedNewsDto, description: 'Paginated news list' })
  @ApiQuery({ name: 'page',  required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20)' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.newsService.findAll(page ? +page : 1, limit ? +limit : 20);
  }

  /**
   * Returns the full body of a single published news article.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single news article by ID' })
  @ApiParam({ name: 'id', description: 'News article UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Full news article object' })
  @ApiNotFoundResponse({ description: 'Article not found or not yet published' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.findOne(id);
  }

  /**
   * Creates a new news article. Setting `publish: true` immediately publishes it
   * and broadcasts an FCM / Telegram / SMS notification to all active members.
   */
  @Post()
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({
    summary: 'Create a news article (admin only)',
    description:
      'Set `publish: true` to publish immediately and broadcast to all active members. ' +
      'Leave `publish` as `false` to save as draft.',
  })
  @ApiCreatedResponse({ description: 'News article created — returns the full article object' })
  @ApiBadRequestResponse({ description: 'Validation error in request body' })
  @ApiForbiddenResponse({ description: 'Only super_admin and admin roles may create news' })
  create(@CurrentUser('id') userId: string, @Body() body: CreateNewsDto) {
    return this.newsService.create(userId, body);
  }

  /**
   * Publishes a previously saved draft article and broadcasts to all active members.
   */
  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({
    summary: 'Publish a draft news article (admin only)',
    description: 'Marks the article as published and broadcasts notifications to all members.',
  })
  @ApiParam({ name: 'id', description: 'News article UUID', format: 'uuid' })
  @ApiOkResponse({ type: OkResponseDto, description: 'Article published' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiForbiddenResponse({ description: 'Only super_admin and admin roles may publish news' })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<OkResponseDto> {
    await this.newsService.publish(id);
    return { ok: true };
  }
}

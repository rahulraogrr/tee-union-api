import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

const mockPrisma = {
  news: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockDispatcher = {
  broadcast: jest.fn().mockResolvedValue(undefined),
};

const mockNews = {
  id: 'news-1',
  titleEn: 'Test News',
  titleTe: null,
  bodyEn: 'Body',
  bodyTe: null,
  isPublished: true,
  publishedAt: new Date(),
  publishedById: 'user-1',
};

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationDispatcherService, useValue: mockDispatcher },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest.clearAllMocks();
  });

  // ── FIND ALL ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated published news', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockNews], 1]);
      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('calculates correct totalPages', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockNews], 55]);
      const result = await service.findAll(1, 20);
      expect(result.totalPages).toBe(3);
    });
  });

  // ── FIND ONE ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns published news article', async () => {
      mockPrisma.news.findFirst.mockResolvedValue(mockNews);
      const result = await service.findOne('news-1');
      expect(result.id).toBe('news-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.news.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates unpublished news without broadcasting', async () => {
      mockPrisma.news.create.mockResolvedValue({ ...mockNews, isPublished: false });

      await service.create('user-1', {
        titleEn: 'Test', bodyEn: 'Body', publish: false,
      });

      expect(mockDispatcher.broadcast).not.toHaveBeenCalled();
    });

    it('creates and broadcasts when publish=true', async () => {
      mockPrisma.news.create.mockResolvedValue(mockNews);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      await service.create('user-1', {
        titleEn: 'Test News', bodyEn: 'Body', publish: true,
      });

      expect(mockDispatcher.broadcast).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        expect.stringContaining('Test News'),
        expect.any(String),
        expect.objectContaining({ type: NotificationType.news }),
      );
    });

    it('does not broadcast when no active users', async () => {
      mockPrisma.news.create.mockResolvedValue(mockNews);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.create('user-1', {
        titleEn: 'Test', bodyEn: 'Body', publish: true,
      });

      expect(mockDispatcher.broadcast).not.toHaveBeenCalled();
    });
  });

  // ── PUBLISH ────────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('publishes and broadcasts news', async () => {
      mockPrisma.news.update.mockResolvedValue(mockNews);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);

      await service.publish('news-1');

      expect(mockPrisma.news.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPublished: true }),
        }),
      );
      expect(mockDispatcher.broadcast).toHaveBeenCalled();
    });
  });
});

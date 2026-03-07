import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockNotification = {
  id: 'notif-1',
  type: 'ticket_update',
  title: 'Test',
  body: 'Test body',
  isRead: false,
  readAt: null,
  isUrgent: false,
  isCritical: false,
  referenceId: null,
  sentAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ── FIND FOR USER ──────────────────────────────────────────────────────────

  describe('findForUser', () => {
    it('returns paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findForUser('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.pages).toBe(1);
    });

    it('filters unread only when flag set', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findForUser('user-1', { page: 1, limit: 20, unreadOnly: true });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('does not filter read status when unreadOnly is false', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findForUser('user-1', { page: 1, limit: 20, unreadOnly: false });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('calculates correct page offset', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findForUser('user-1', { page: 3, limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── GET UNREAD COUNT ───────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ count: 5 });
    });

    it('returns 0 when no unread', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ count: 0 });
    });
  });

  // ── MARK ALL READ ──────────────────────────────────────────────────────────

  describe('markAllReadForUser', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      await service.markAllReadForUser('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });
});

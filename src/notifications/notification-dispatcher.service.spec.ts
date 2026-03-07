import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDispatcherService, NOTIFICATION_QUEUE } from './notification-dispatcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
import { getQueueToken } from '@nestjs/bull';
import { NotificationType } from '@prisma/client';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  notification: {
    update: jest.fn(),
    createManyAndReturn: jest.fn(),
  },
};

const mockFcm = {
  sendToTokens: jest.fn().mockResolvedValue(true),
};

const mockTelegram = {
  isEnabled: jest.fn().mockReturnValue(false),
  sendNotification: jest.fn().mockResolvedValue(true),
};

const mockSms = {
  isEnabled: jest.fn().mockReturnValue(false),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
  getJobs: jest.fn().mockResolvedValue([]),
};

const mockUser = {
  telegramChatId: null,
  mobileNo: '9876543210',
  pushTokens: [{ token: 'fcm-token-1' }],
};

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FcmService, useValue: mockFcm },
        { provide: TelegramService, useValue: mockTelegram },
        { provide: SmsService, useValue: mockSms },
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<NotificationDispatcherService>(NotificationDispatcherService);
    jest.clearAllMocks();
    mockTelegram.isEnabled.mockReturnValue(false);
    mockSms.isEnabled.mockReturnValue(false);
  });

  // ── DISPATCH ───────────────────────────────────────────────────────────────

  describe('dispatch', () => {
    it('sends FCM when tokens available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.update.mockResolvedValue({});
      mockFcm.sendToTokens.mockResolvedValue(true);

      await service.dispatch({
        notificationId: 'notif-1',
        userId: 'user-1',
        title: 'Test',
        body: 'Body',
      });

      expect(mockFcm.sendToTokens).toHaveBeenCalledWith(
        ['fcm-token-1'],
        expect.objectContaining({ title: 'Test', body: 'Body' }),
      );
    });

    it('skips FCM when no push tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, pushTokens: [] });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.dispatch({
        notificationId: 'notif-1', userId: 'user-1', title: 'Test', body: 'Body',
      });

      expect(mockFcm.sendToTokens).not.toHaveBeenCalled();
    });

    it('returns early when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.dispatch({
        notificationId: 'notif-1', userId: 'bad-user', title: 'T', body: 'B',
      });

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('queues Telegram fallback when user has telegram and service enabled', async () => {
      mockTelegram.isEnabled.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser, telegramChatId: BigInt(123456789),
      });
      mockPrisma.notification.update.mockResolvedValue({});
      mockFcm.sendToTokens.mockResolvedValue(true);

      await service.dispatch({
        notificationId: 'notif-1', userId: 'user-1', title: 'T', body: 'B',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'telegram-fallback',
        expect.objectContaining({ notificationId: 'notif-1' }),
        expect.objectContaining({ delay: 5 * 60 * 1000 }),
      );
    });

    it('sends Telegram immediately for urgent notifications', async () => {
      mockTelegram.isEnabled.mockReturnValue(true);
      const chatId = BigInt(123456789);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, telegramChatId: chatId });
      mockPrisma.notification.update.mockResolvedValue({});
      mockTelegram.sendNotification.mockResolvedValue(true);

      await service.dispatch({
        notificationId: 'notif-1', userId: 'user-1', title: 'T', body: 'B', isUrgent: true,
      });

      expect(mockTelegram.sendNotification).toHaveBeenCalled();
    });

    it('queues SMS fallback for critical notifications', async () => {
      mockSms.isEnabled.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.update.mockResolvedValue({});
      mockFcm.sendToTokens.mockResolvedValue(true);

      await service.dispatch({
        notificationId: 'notif-1', userId: 'user-1', title: 'T', body: 'B', isCritical: true,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'sms-fallback',
        expect.objectContaining({ phone: '9876543210' }),
        expect.objectContaining({ delay: 15 * 60 * 1000 }),
      );
    });

    it('updates notification with fcmSent=true on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.update.mockResolvedValue({});
      mockFcm.sendToTokens.mockResolvedValue(true);

      await service.dispatch({
        notificationId: 'notif-1', userId: 'user-1', title: 'T', body: 'B',
      });

      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fcmSent: true, deliveredVia: 'fcm' }),
        }),
      );
    });
  });

  // ── BROADCAST ──────────────────────────────────────────────────────────────

  describe('broadcast', () => {
    it('creates notifications and dispatches to all users', async () => {
      const notifications = [
        { id: 'n1', userId: 'u1' },
        { id: 'n2', userId: 'u2' },
      ];
      mockPrisma.notification.createManyAndReturn.mockResolvedValue(notifications);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, pushTokens: [] });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.broadcast(['u1', 'u2'], 'Title', 'Body', {
        type: NotificationType.news,
      });

      expect(mockPrisma.notification.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'u1', type: NotificationType.news }),
          ]),
        }),
      );
    });
  });

  // ── MARK READ ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('marks notification as read and removes pending jobs', async () => {
      const mockJob = {
        data: { notificationId: 'notif-1' },
        remove: jest.fn(),
      };
      mockPrisma.notification.update.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([mockJob]);

      await service.markRead('notif-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRead: true }),
        }),
      );
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('does not remove jobs for other notifications', async () => {
      const mockJob = {
        data: { notificationId: 'other-notif' },
        remove: jest.fn(),
      };
      mockPrisma.notification.update.mockResolvedValue({});
      mockQueue.getJobs.mockResolvedValue([mockJob]);

      await service.markRead('notif-1');

      expect(mockJob.remove).not.toHaveBeenCalled();
    });
  });
});

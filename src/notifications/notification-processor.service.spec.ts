import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessorService } from './notification-processor.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { SmsService } from '../sms/sms.service';
import { getQueueToken } from '@nestjs/bull';
import { NOTIFICATION_QUEUE } from './notification-dispatcher.service';

const mockPrisma = {
  notification: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockTelegram = {
  sendNotification: jest.fn().mockResolvedValue(true),
};

const mockSms = {
  formatNotification: jest.fn().mockReturnValue('SMS: Test message'),
  sendSms: jest.fn().mockResolvedValue(true),
};

const mockQueue = { add: jest.fn() };

describe('NotificationProcessorService', () => {
  let service: NotificationProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegram },
        { provide: SmsService, useValue: mockSms },
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<NotificationProcessorService>(NotificationProcessorService);
    jest.clearAllMocks();
  });

  const makeJob = (data: object) => ({ data } as any);

  // ── TELEGRAM FALLBACK ──────────────────────────────────────────────────────

  describe('processTelegramFallback', () => {
    const job = makeJob({
      notificationId: 'notif-1',
      userId: 'user-1',
      title: 'Test',
      body: 'Body',
      chatId: '123456789',
    });

    it('sends Telegram message for unread notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, telegramSent: false,
      });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.processTelegramFallback(job);

      expect(mockTelegram.sendNotification).toHaveBeenCalledWith(
        BigInt('123456789'), 'Test', 'Body',
      );
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ telegramSent: true, deliveredVia: 'telegram' }),
        }),
      );
    });

    it('skips when notification already read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: true, telegramSent: false,
      });

      await service.processTelegramFallback(job);

      expect(mockTelegram.sendNotification).not.toHaveBeenCalled();
    });

    it('skips when telegram already sent', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, telegramSent: true,
      });

      await service.processTelegramFallback(job);

      expect(mockTelegram.sendNotification).not.toHaveBeenCalled();
    });

    it('skips when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await service.processTelegramFallback(job);

      expect(mockTelegram.sendNotification).not.toHaveBeenCalled();
    });

    it('does not update when Telegram send fails', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, telegramSent: false,
      });
      mockTelegram.sendNotification.mockResolvedValue(false);

      await service.processTelegramFallback(job);

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  // ── SMS FALLBACK ───────────────────────────────────────────────────────────

  describe('processSmsFallback', () => {
    const job = makeJob({
      notificationId: 'notif-1',
      userId: 'user-1',
      title: 'Test',
      body: 'Body',
      phone: '+919876543210',
    });

    it('sends SMS for unread critical notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, smsSent: false,
      });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.processSmsFallback(job);

      expect(mockSms.formatNotification).toHaveBeenCalledWith('Test', 'Body');
      expect(mockSms.sendSms).toHaveBeenCalledWith('+919876543210', 'SMS: Test message');
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ smsSent: true, deliveredVia: 'sms' }),
        }),
      );
    });

    it('skips when notification already read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: true, smsSent: false,
      });

      await service.processSmsFallback(job);

      expect(mockSms.sendSms).not.toHaveBeenCalled();
    });

    it('skips when SMS already sent', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, smsSent: true,
      });

      await service.processSmsFallback(job);

      expect(mockSms.sendSms).not.toHaveBeenCalled();
    });

    it('skips when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await service.processSmsFallback(job);

      expect(mockSms.sendSms).not.toHaveBeenCalled();
    });

    it('does not update when SMS send fails', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        isRead: false, smsSent: false,
      });
      mockSms.sendSms.mockResolvedValue(false);

      await service.processSmsFallback(job);

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });
});

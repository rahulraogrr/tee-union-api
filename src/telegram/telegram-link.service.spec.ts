import { Test, TestingModule } from '@nestjs/testing';
import { TelegramLinkService } from './telegram-link.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  telegramLinkToken: {
    updateMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockTelegram = {
  isEnabled: jest.fn().mockReturnValue(true),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  getBot: jest.fn().mockReturnValue({
    getMe: jest.fn().mockResolvedValue({ username: 'tee1104unionbot' }),
    onText: jest.fn(),
  }),
};

describe('TelegramLinkService', () => {
  let service: TelegramLinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramLinkService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegram },
      ],
    }).compile();

    service = module.get<TelegramLinkService>(TelegramLinkService);
    jest.clearAllMocks();
    mockTelegram.isEnabled.mockReturnValue(true);
  });

  // ── GENERATE LINK TOKEN ────────────────────────────────────────────────────

  describe('generateLinkToken', () => {
    it('generates a token and returns instructions', async () => {
      mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({});
      mockPrisma.telegramLinkToken.create.mockResolvedValue({});

      const result = await service.generateLinkToken('user-1');

      expect(result.token).toHaveLength(8);
      expect(result.instructions).toContain('/link');
      expect(result.instructions).toContain('tee1104unionbot');
    });

    it('expires existing tokens before creating new one', async () => {
      mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({});
      mockPrisma.telegramLinkToken.create.mockResolvedValue({});

      await service.generateLinkToken('user-1');

      expect(mockPrisma.telegramLinkToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  // ── HANDLE LINK COMMAND ────────────────────────────────────────────────────

  describe('handleLinkCommand', () => {
    const chatId = BigInt(123456789);
    const validRecord = {
      token: 'ABCD1234',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 'user-1', telegramChatId: null },
    };

    it('links telegram when valid token provided', async () => {
      mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(validRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handleLinkCommand(chatId, 'ABCD1234');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('linked'),
      );
    });

    it('sends error message for invalid token', async () => {
      mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(null);

      await service.handleLinkCommand(chatId, 'INVALID');

      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('Invalid or expired'),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('sends error message for expired token', async () => {
      mockPrisma.telegramLinkToken.findUnique.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 60000),
      });

      await service.handleLinkCommand(chatId, 'ABCD1234');

      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('Invalid or expired'),
      );
    });

    it('sends error message for already used token', async () => {
      mockPrisma.telegramLinkToken.findUnique.mockResolvedValue({
        ...validRecord,
        usedAt: new Date(),
      });

      await service.handleLinkCommand(chatId, 'ABCD1234');

      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('Invalid or expired'),
      );
    });

    it('warns when account already linked to different chatId', async () => {
      mockPrisma.telegramLinkToken.findUnique.mockResolvedValue({
        ...validRecord,
        user: { id: 'user-1', telegramChatId: BigInt(999999) },
      });

      await service.handleLinkCommand(chatId, 'ABCD1234');

      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('already linked'),
      );
    });
  });

  // ── UNLINK TELEGRAM ────────────────────────────────────────────────────────

  describe('unlinkTelegram', () => {
    it('unlinks telegram and notifies user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        telegramChatId: BigInt(123456789),
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.unlinkTelegram('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { telegramChatId: null, telegramLinkedAt: null },
        }),
      );
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith(
        BigInt(123456789),
        expect.stringContaining('unlinked'),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.unlinkTelegram('bad-user'))
        .rejects.toThrow(NotFoundException);
    });

    it('does not send Telegram message when no chatId linked', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ telegramChatId: null });
      mockPrisma.user.update.mockResolvedValue({});

      await service.unlinkTelegram('user-1');

      expect(mockTelegram.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ── REGISTER COMMAND HANDLERS ──────────────────────────────────────────────

  describe('registerCommandHandlers', () => {
    it('registers handlers when Telegram is enabled', () => {
      const mockBot = { getMe: jest.fn(), onText: jest.fn() };
      mockTelegram.getBot.mockReturnValue(mockBot);

      service.registerCommandHandlers();

      expect(mockBot.onText).toHaveBeenCalledTimes(2);
    });

    it('skips registration when Telegram is disabled', () => {
      mockTelegram.isEnabled.mockReturnValue(false);
      const mockBot = { onText: jest.fn() };
      mockTelegram.getBot.mockReturnValue(mockBot);

      service.registerCommandHandlers();

      expect(mockBot.onText).not.toHaveBeenCalled();
    });
  });
});

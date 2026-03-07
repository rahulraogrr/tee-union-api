import { Test, TestingModule } from '@nestjs/testing';
import { FcmService } from './fcm.service';
import { ConfigService } from '@nestjs/config';

const mockSendEachForMulticast = jest.fn();

// Mock firebase-admin — keeps apps as an empty array mock
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn().mockReturnValue({}),
    credential: {
      cert: jest.fn().mockReturnValue('mock-credential'),
    },
    messaging: jest.fn().mockReturnValue({
      sendEachForMulticast: (...args: any[]) => mockSendEachForMulticast(...args),
    }),
  };
});

const mockConfig = { get: jest.fn() };

describe('FcmService', () => {
  let service: FcmService;

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    return module.get<FcmService>(FcmService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── ON MODULE INIT ─────────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('disables FCM when credentials not configured', async () => {
      mockConfig.get.mockReturnValue(undefined);
      service = await buildService();
      service.onModuleInit();
      expect(service.isEnabled()).toBe(false);
    });

    it('enables FCM when all credentials provided', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce('client@example.com')
        .mockReturnValueOnce('-----BEGIN RSA PRIVATE KEY-----\nABC\n-----END RSA PRIVATE KEY-----\n');

      service = await buildService();
      service.onModuleInit();
      expect(service.isEnabled()).toBe(true);
    });

    it('disables FCM when only some credentials set', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce(undefined)  // missing clientEmail
        .mockReturnValueOnce('private-key');

      service = await buildService();
      service.onModuleInit();
      expect(service.isEnabled()).toBe(false);
    });
  });

  // ── IS ENABLED ─────────────────────────────────────────────────────────────

  describe('isEnabled', () => {
    it('returns false by default before init', async () => {
      mockConfig.get.mockReturnValue(undefined);
      service = await buildService();
      expect(service.isEnabled()).toBe(false);
    });
  });

  // ── SEND TO TOKENS ─────────────────────────────────────────────────────────

  describe('sendToTokens', () => {
    it('returns false when FCM is disabled', async () => {
      mockConfig.get.mockReturnValue(undefined);
      service = await buildService();
      service.onModuleInit();

      const result = await service.sendToTokens(['token1'], { title: 'T', body: 'B' });
      expect(result).toBe(false);
    });

    it('returns false for empty token array', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce('client@example.com')
        .mockReturnValueOnce('key');

      service = await buildService();
      service.onModuleInit();

      const result = await service.sendToTokens([], { title: 'T', body: 'B' });
      expect(result).toBe(false);
    });

    it('returns true when at least one token succeeds', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce('client@example.com')
        .mockReturnValueOnce('key');

      service = await buildService();
      service.onModuleInit();

      mockSendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 0 });

      const result = await service.sendToTokens(['fcm-token'], { title: 'T', body: 'B' });
      expect(result).toBe(true);
    });

    it('returns false when all tokens fail', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce('client@example.com')
        .mockReturnValueOnce('key');

      service = await buildService();
      service.onModuleInit();

      mockSendEachForMulticast.mockResolvedValue({ successCount: 0, failureCount: 1 });

      const result = await service.sendToTokens(['bad-token'], { title: 'T', body: 'B' });
      expect(result).toBe(false);
    });

    it('returns false and logs error on exception', async () => {
      mockConfig.get
        .mockReturnValueOnce('proj-id')
        .mockReturnValueOnce('client@example.com')
        .mockReturnValueOnce('key');

      service = await buildService();
      service.onModuleInit();

      mockSendEachForMulticast.mockRejectedValue(new Error('Firebase error'));

      const result = await service.sendToTokens(['token'], { title: 'T', body: 'B' });
      expect(result).toBe(false);
    });
  });
});

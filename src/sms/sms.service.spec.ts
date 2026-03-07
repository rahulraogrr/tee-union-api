import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';

// Mock AWS SNS client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const mockConfig = { get: jest.fn() };

describe('SmsService', () => {
  let service: SmsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  describe('onModuleInit', () => {
    it('disables SMS when AWS credentials not configured', () => {
      mockConfig.get.mockReturnValue(undefined);
      service.onModuleInit();
      expect(service.isEnabled()).toBe(false);
    });

    it('enables SMS when AWS credentials provided', () => {
      mockConfig.get
        .mockReturnValueOnce('AKIAIOSFODNN7EXAMPLE')
        .mockReturnValueOnce('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
        .mockReturnValueOnce('ap-south-1')
        .mockReturnValueOnce('TEE1104');

      service.onModuleInit();
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('sendSms', () => {
    it('returns false when SMS is disabled', async () => {
      mockConfig.get.mockReturnValue(undefined);
      service.onModuleInit();

      const result = await service.sendSms('+919876543210', 'Test message');
      expect(result).toBe(false);
    });

    it('sends SMS and returns true on success', async () => {
      mockConfig.get
        .mockReturnValueOnce('AKID')
        .mockReturnValueOnce('SECRET')
        .mockReturnValueOnce('ap-south-1')
        .mockReturnValueOnce('TEE1104');

      service.onModuleInit();
      mockSend.mockResolvedValue({ MessageId: 'msg-123' });

      const result = await service.sendSms('+919876543210', 'Test message');
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns false on SNS error', async () => {
      mockConfig.get
        .mockReturnValueOnce('AKID')
        .mockReturnValueOnce('SECRET')
        .mockReturnValueOnce('ap-south-1')
        .mockReturnValueOnce('TEE1104');

      service.onModuleInit();
      mockSend.mockRejectedValue(new Error('SNS error'));

      const result = await service.sendSms('+919876543210', 'Test message');
      expect(result).toBe(false);
    });
  });

  describe('formatNotification', () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue(undefined);
      service.onModuleInit();
    });

    it('formats short notification correctly', () => {
      const msg = service.formatNotification('Ticket Updated', 'Your ticket is resolved.');
      expect(msg).toContain('TEE 1104 Union:');
      expect(msg).toContain('Ticket Updated');
      expect(msg).toContain('Open the app for details.');
    });

    it('truncates long body to fit within 160 chars', () => {
      const longBody = 'A'.repeat(200);
      const msg = service.formatNotification('Title', longBody);
      expect(msg.length).toBeLessThanOrEqual(160);
      expect(msg).toContain('…');
    });

    it('does not truncate short body', () => {
      const msg = service.formatNotification('Title', 'Short body.');
      expect(msg).toContain('Short body.');
      expect(msg).not.toContain('…');
    });
  });
});

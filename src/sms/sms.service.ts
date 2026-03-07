import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SNSClient,
  PublishCommand,
  PublishCommandInput,
} from '@aws-sdk/client-sns';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private client: SNSClient | null = null;
  private senderId: string;
  private enabled = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.config.get<string>('AWS_REGION') ?? 'ap-south-1';

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'AWS credentials not configured — SMS notifications disabled.',
      );
      return;
    }

    this.client = new SNSClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.senderId =
      this.config.get<string>('AWS_SNS_SENDER_ID') ?? 'TEE1104';
    this.enabled = true;
    this.logger.log(`SMS service initialised via AWS SNS (region: ${region}) ✅`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ---------------------------------------------------------------------------
  // Send an SMS to a mobile number
  // E.164 format expected: +919876543210
  // ---------------------------------------------------------------------------
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    const params: PublishCommandInput = {
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Ensures delivery priority
        },
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: this.senderId,
        },
      },
    };

    try {
      const response = await this.client.send(new PublishCommand(params));
      this.logger.log(
        `SMS sent to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}, ` +
          `messageId: ${response.MessageId}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `SMS send failed for ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`,
        err,
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Format a notification as a short SMS (160 chars max for single segment)
  // ---------------------------------------------------------------------------
  formatNotification(title: string, body: string): string {
    const prefix = 'TEE 1104 Union: ';
    const suffix = ' Open the app for details.';
    const maxBody = 160 - prefix.length - suffix.length - title.length - 2;

    const truncatedBody =
      body.length > maxBody ? body.substring(0, maxBody - 1) + '…' : body;

    return `${prefix}${title}: ${truncatedBody}${suffix}`;
  }
}

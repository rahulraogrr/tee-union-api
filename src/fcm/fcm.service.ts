import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App;
  private enabled = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const projectId   = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey  = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured — FCM push notifications disabled. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env',
      );
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    this.enabled = true;
    this.logger.log('Firebase Admin SDK initialised ✅');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ---------------------------------------------------------------------------
  // Send to one or more FCM tokens (member may have phone + tablet)
  // Returns true if at least one token succeeded
  // ---------------------------------------------------------------------------
  async sendToTokens(tokens: string[], payload: FcmPayload): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug('FCM disabled — skipping push notification');
      return false;
    }
    if (!tokens.length) return false;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body:  payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'tee_union' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `FCM sent: ${response.successCount} success, ${response.failureCount} failed`,
      );
      return response.successCount > 0;
    } catch (err) {
      this.logger.error('FCM send failed', err);
      return false;
    }
  }
}

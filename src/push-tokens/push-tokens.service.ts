import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformType } from '@prisma/client';

@Injectable()
export class PushTokensService {
  private readonly logger = new Logger(PushTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a new FCM push token for the authenticated user.
   *
   * Uses an upsert on the token string so that:
   * - Re-registering the same token is idempotent (just updates `lastUsedAt`).
   * - A user can have multiple tokens (multiple devices).
   *
   * @param userId   - Authenticated user's ID
   * @param token    - FCM registration token
   * @param platform - ios | android
   */
  async register(
    userId: string,
    token: string,
    platform: PlatformType,
  ): Promise<{ ok: boolean }> {
    // The token column has no unique DB constraint, so we check-then-create/update.
    // Using updateMany + create is safe: FCM tokens are globally unique in practice.
    const existing = await this.prisma.pushToken.findFirst({ where: { token } });

    if (existing) {
      await this.prisma.pushToken.update({
        where: { id: existing.id },
        data: { userId, platform, lastUsedAt: new Date() },
      });
    } else {
      await this.prisma.pushToken.create({
        data: { userId, token, platform },
      });
    }

    this.logger.log(`Push token registered — userId: ${userId}, platform: ${platform}`);
    return { ok: true };
  }

  /**
   * Removes a specific FCM token from the database.
   * Called when the user logs out from a device or the app is uninstalled.
   *
   * @param userId - Authenticated user's ID (ensures ownership)
   * @param token  - FCM registration token to remove
   */
  async unregister(userId: string, token: string): Promise<{ ok: boolean }> {
    const deleted = await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });

    if (deleted.count > 0) {
      this.logger.log(`Push token unregistered — userId: ${userId}`);
    } else {
      this.logger.warn(`Push token not found for removal — userId: ${userId}`);
    }

    return { ok: true };
  }

  /**
   * Removes ALL FCM tokens for the user.
   * Called on logout-all-devices or account deactivation.
   *
   * @param userId - Authenticated user's ID
   */
  async unregisterAll(userId: string): Promise<{ ok: boolean; removed: number }> {
    const result = await this.prisma.pushToken.deleteMany({ where: { userId } });
    this.logger.log(`All push tokens cleared — userId: ${userId}, count: ${result.count}`);
    return { ok: true, removed: result.count };
  }
}

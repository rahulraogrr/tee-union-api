import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcherService, NOTIFICATION_QUEUE } from './notification-dispatcher.service';
import { NotificationProcessorService } from './notification-processor.service';
import { FcmModule } from '../fcm/fcm.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SmsModule } from '../sms/sms.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    FcmModule,
    TelegramModule,
    SmsModule,
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatcherService,
    NotificationProcessorService,
  ],
  exports: [NotificationDispatcherService, NotificationsService],
})
export class NotificationsModule {}

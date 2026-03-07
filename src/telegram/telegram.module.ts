import { Module, OnModuleInit } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramLinkService } from './telegram-link.service';
import { TelegramController } from './telegram.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramLinkService],
  exports: [TelegramService, TelegramLinkService],
})
export class TelegramModule implements OnModuleInit {
  constructor(private readonly linkService: TelegramLinkService) {}

  onModuleInit() {
    // Register /link and /start command listeners after all providers are ready
    this.linkService.registerCommandHandlers();
  }
}

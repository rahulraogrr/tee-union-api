import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ---------------------------------------------------------------------------
// Prisma v7: the client no longer reads DATABASE_URL automatically.
// We must pass a driver adapter explicitly. @prisma/adapter-pg wraps the
// native `pg` pool and hands it to PrismaClient at construction time.
// ---------------------------------------------------------------------------

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Check your .env file in the project root.',
      );
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected ✅');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

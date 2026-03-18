import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global module — RedisService is available everywhere without explicit imports.
 */
@Global()
@Module({
  providers: [RedisService],
  exports:   [RedisService],
})
export class RedisModule {}

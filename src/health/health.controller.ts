import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './prisma.health';

/**
 * Exposes liveness and readiness probes for use by load balancers,
 * Kubernetes, and monitoring systems. All endpoints are public (no JWT required)
 * and exempt from rate limiting.
 */
@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness probe — returns 200 if the process is alive.
   * Kubernetes restarts the pod if this returns non-200.
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Returns 200 while the process is running. Used by Kubernetes liveness checks.',
  })
  @HealthCheck()
  live() {
    // Memory heap < 512 MB — basic sanity check
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness probe — returns 200 only when all dependencies are reachable.
   * Kubernetes stops routing traffic to the pod if this returns non-200.
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 when the database is reachable. ' +
      'Used by Kubernetes readiness checks and load balancer health checks.',
  })
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
    ]);
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    const { user } = req as any;
    const hasRole = requiredRoles.includes(user?.role);

    if (!hasRole) {
      this.logger.warn(
        `Role access denied — userId: ${user?.id ?? '?'}, role: ${user?.role ?? '?'}, ` +
        `required: [${requiredRoles.join(', ')}], ` +
        `route: ${req.method} ${req.url}` +
        (req.id ? ` [${req.id}]` : ''),
      );
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}

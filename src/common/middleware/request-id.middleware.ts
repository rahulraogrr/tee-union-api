import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a unique correlation ID to every HTTP request.
 *
 * - Reads the `X-Request-Id` header if the client provides one (e.g. mobile app, API gateway).
 * - Generates a UUID v4 if none is provided.
 * - Attaches the ID to `req.id` for downstream use (logging, error responses).
 * - Echoes it back in the `X-Request-Id` response header so clients can correlate.
 *
 * Must be applied BEFORE HttpLoggerMiddleware so that the logger can include the ID.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).id = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}

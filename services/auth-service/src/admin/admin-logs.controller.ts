// services/auth-service/src/audit/adminLogsController.ts

import { Router, Request, Response, NextFunction } from 'express';
import { Pool, QueryResult } from 'pg';
import { authGuard } from '../auth/guard'; 
import { logger } from '../logging/logger'; 
import { AdminActionData } from './audit.service';

// Extend the Request interface to know about the user object attached by authGuard
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string; };
      correlationId?: string;
    }
  }
}

// Define expected query parameters for type safety
interface AdminLogsQuery {
  limit?: string;
  cursor?: string;
}

/**
 * Handles API endpoints for reading immutable admin audit logs.
 */
export class AdminLogsController {
  private router = Router();

  constructor(private pool: Pool) {
    this.routes();
  }

  private routes() {
    this.router.get(
      '/admin/audit-logs',
      authGuard,
      this.requireAdmin,
      this.getLogs.bind(this)
    );
  }

  /**
   * Authorization guard to ensure only specific, trusted roles can access these sensitive logs.
   */
  private requireAdmin(req: Request, res: Response, next: NextFunction) {
    // Check for specific roles allowed to view logs
    if (!['admin', 'security', 'super_admin'].includes(req.user?.role || '')) {
      logger.warn('ADMIN_LOG_ACCESS_DENIED', { 
        userId: req.user?.userId, 
        role: req.user?.role, 
        correlationId: req.correlationId 
      });
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions to view audit logs.' });
    }
    next();
  }

  /**
   * Retrieves paginated audit logs using cursor-based pagination (efficient).
   */
  private async getLogs(req: Request, res: Response) {
    const correlationId = req.correlationId;
    logger.info('FETCH_ADMIN_LOGS_REQUEST', { userId: req.user?.userId, correlationId, query: req.query });

    // Use the type-safe interface to extract query parameters
    const { limit: limitStr, cursor: cursorStr } = req.query as unknown as AdminLogsQuery;

    // Safely parse and clamp limits (between 1 and 100)
    const limit = Math.min(Math.max(Number(limitStr) > 0 ? Number(limitStr) : 50, 1), 100);

    // Validate cursor input: ensure it is a valid ISO date string
    let cursor: string | undefined;
    if (cursorStr) {
      const parsed = new Date(cursorStr);
      if (!isNaN(parsed.getTime())) {
        cursor = parsed.toISOString();
      } else {
        // If cursor is invalid, log and return 400 Bad Request
        logger.warn('INVALID_CURSOR_INPUT', { cursor: cursorStr, correlationId });
        return res.status(400).json({ message: 'Invalid cursor format. Must be a valid ISO date string.' });
      }
    }

    try {
      const queryText = cursor
        ? `SELECT * FROM admin_logs WHERE created_at < $1 ORDER BY created_at DESC LIMIT $2`
        : `SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT $1`;
      const values = cursor ? [cursor, limit] : [limit];

      const result: QueryResult<AdminActionData> = await this.pool.query(queryText, values);
      
      // Ensure we treat the potentially returned date object as a string for the cursor
      const nextCursor = result.rows.length > 0 ? (result.rows.at(-1)?.created_at as unknown as string) : undefined;

      res.json({
        logs: result.rows,
        nextCursor,
        hasMore: result.rows.length === limit // Simple check if more pages are likely available
      });

    } catch (error) {
      // Log errors using the structured logger
      logger.error('ADMIN_LOG_FETCH_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        correlationId,
        userId: req.user?.userId
      });
      res.status(500).json({ message: 'Internal server error while fetching logs.' });
    }
  }

  getRouter() {
    return this.router;
  }
}

// Export helper for easy integration into server.ts
export const adminLogsRouter = (pool: Pool) => new AdminLogsController(pool).getRouter();

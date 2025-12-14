// services/auth-service/src/admin/adminLogsController.ts

import { Router, Request, Response, NextFunction } from 'express';
import { Pool, QueryResult } from 'pg';
import { authGuard } from '../auth/guard';
import { logger } from '../logging/logger';
import { AdminActionData } from './audit.service';
import {
  Signal,
  scoreAnomalyWithThreshold,
  handleAnomaly,
  anomalyContext,
  AnomalyHandlerOptions,
  ADMIN_SIGNALS // Assumed imported from anomaly-engine.ts
} from '../security/anomaly-engine';

// Extend Request interface for user and correlationId
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string };
      correlationId?: string;
    }
  }
}

interface AdminLogsQuery {
  limit?: string;
  cursor?: string;
}

/**
 * AdminLogsController
 * Handles immutable admin audit logs with automatic anomaly scoring and batch logging
 */
export class AdminLogsController {
  private router = Router();

  constructor(private pool: Pool) {
    this.routes();
  }

  private routes() {
    // Apply middleware order: authGuard -> setAnomalyContext -> requireAdmin -> wrapWithAnomaly
    this.router.get(
      '/admin/audit-logs',
      authGuard,
      this.setAnomalyContext,
      this.requireAdmin,
      this.wrapWithAnomaly(this.getLogs.bind(this), 'FETCH', 'admin_logs')
    );
  }

  /**
   * Middleware to set AsyncLocalStorage context for enriched anomaly metadata
   */
  private setAnomalyContext = (req: Request, res: Response, next: NextFunction) => {
    // We run the entire chain within the context store
    anomalyContext.run(
      {
        // Coalesce potential nulls for type safety/consistency with the engine's context type
        userId: req.user?.userId ?? null, 
        correlationId: req.correlationId ?? null,
        ip: req.ip ?? null,
        route: req.originalUrl,
        userAgent: req.headers['user-agent'] ?? null
      },
      next
    );
  };

  /**
   * Require admin-level role
   */
  private requireAdmin(req: Request, res: Response, next: NextFunction) {
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
   * Wrapper to auto-score anomalies and enqueue batch logging
   */
  private wrapWithAnomaly(
    handler: (req: Request, res: Response) => Promise<any>,
    actionName: 'CREATE' | 'UPDATE' | 'DELETE' | 'FETCH',
    targetResource: string
  ) {
    return async (req: Request, res: Response) => {
      const cursor = req.query.cursor as string | undefined;
      const isOffHours = this.isOffHours();

      // Pull enriched metadata from AsyncLocalStorage context (guaranteed to exist here due to middleware order)
      const context = anomalyContext.getStore();
      const userId = context?.userId;
      const correlationId = context?.correlationId;
      const ip = context?.ip;
      const route = context?.route;
      const userAgent = context?.userAgent;

      // Generate anomaly signals
      const signals: Signal[] = [
        ADMIN_SIGNALS.ADMIN_ENDPOINT,
        ADMIN_SIGNALS.NON_STANDARD_CURSOR(cursor),
        ADMIN_SIGNALS.OFF_HOURS_ACCESS(isOffHours)
      ];

      // Immediate scoring for real-time alerts (uses default engine threshold of 50 unless specified)
      const { total, exceeded } = scoreAnomalyWithThreshold(signals, 40);
      if (exceeded) {
        logger.warn('ANOMALOUS_ADMIN_ACCESS_THRESHOLD_EXCEEDED', {
          userId,
          anomalyScore: total,
          correlationId,
          actionName,
          targetResource,
          cursor,
          isOffHours
        });
      }

      // Fire-and-forget batch logging
      const handlerOptions: AnomalyHandlerOptions = {
        pgPool: this.pool,
        logger,
        actionName,
        targetResource,
        // Pass surrounding metadata to be combined in the engine's handleAnomaly function
        metadata: { cursor, isOffHours } 
      };
      // Use `void` to explicitly mark fire-and-forget
      void handleAnomaly(signals, handlerOptions);

      await handler(req, res);
    };
  }

  /**
   * Fetch admin audit logs with pagination
   */
  private async getLogs(req: Request, res: Response) {
    // Access context via req object as this is a standard Express handler
    const correlationId = req.correlationId; 
    logger.info('FETCH_ADMIN_LOGS_REQUEST', { userId: req.user?.userId, correlationId, query: req.query });

    const { limit: limitStr, cursor: cursorStr } = req.query as unknown as AdminLogsQuery;
    const limit = Math.min(Math.max(Number(limitStr) > 0 ? Number(limitStr) : 50, 1), 100);

    let cursor: string | undefined;
    if (cursorStr) {
      const parsed = new Date(cursorStr);
      if (!isNaN(parsed.getTime())) cursor = parsed.toISOString();
      else return res.status(400).json({ message: 'Invalid cursor format. Must be ISO date string.' });
    }

    try {
      // Use deterministic pagination via secondary sort on ID
      const queryText = cursor
        ? `SELECT * FROM admin_logs WHERE created_at < $1 ORDER BY created_at DESC, id DESC LIMIT $2`
        : `SELECT * FROM admin_logs ORDER BY created_at DESC, id DESC LIMIT $1`;
      const values = cursor ? [cursor, limit] : [limit];

      const result: QueryResult<AdminActionData> = await this.pool.query(queryText, values);

      const nextCursor = result.rows.length > 0 ? result.rows.at(-1)?.created_at as string : undefined;

      res.json({
        logs: result.rows,
        nextCursor,
        hasMore: result.rows.length === limit
      });
    } catch (err) {
      logger.error('ADMIN_LOG_FETCH_ERROR', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        correlationId,
        userId: req.user?.userId
      });
      res.status(500).json({ message: 'Internal server error while fetching logs.' });
    }
  }

  /**
   * Detect off-hours (example: 6 PM – 6 AM)
   */
  private isOffHours(): boolean {
    const hour = new Date().getHours();
    return hour < 6 || hour > 20;
  }

  getRouter() {
    return this.router;
  }
}

// Export helper
export const adminLogsRouter = (pool: Pool) => new AdminLogsController(pool).getRouter();

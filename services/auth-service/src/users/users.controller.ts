// services/auth-service/src/users/users.controller.ts

import { Router, Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { authGuard } from '../auth/guard';
import { Pool } from 'pg';
import { User } from './user.entity';
import { body, param, query, validationResult } from 'express-validator';
import winston from 'winston';
import { aiTestQueue } from '../queue/ai-test-queue';
import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// --- Controller ---
export class UsersController {
  private router: Router;
  private usersService: UsersService;

  constructor(private pool: Pool) {
    this.usersService = new UsersService(pool);
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /users - paginated, admin-only
    this.router.get(
      '/',
      authGuard,
      this.requireRole('admin'),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('cursor').optional().isISO8601(),
      this.getAllUsers.bind(this)
    );

    // GET /users/:id - self or admin
    this.router.get(
      '/:id',
      authGuard,
      param('id').isInt({ min: 1 }),
      this.getUserById.bind(this)
    );

    // POST /users/:id/generate-test - AI-generated tests
    this.router.post(
      '/:id/generate-test',
      authGuard,
      param('id').isInt({ min: 1 }),
      body('programOfInterest')
        .isString()
        .notEmpty()
        .withMessage('programOfInterest must be a non-empty string'),
      this.generateAITest.bind(this)
    );
  }

  // Role-based middleware
  private requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        logger.warn({ message: 'Forbidden: Insufficient permissions', user: req.user });
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }
      next();
    };
  }

  // GET /users - cursor-based pagination
  private async getAllUsers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({ route: req.originalUrl, errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    try {
      const users: User[] = await this.usersService.getAllCursor(limit, cursor);
      const nextCursor = users.length > 0 ? users[users.length - 1].created_at.toISOString() : null;
      res.status(200).json({ users, limit, nextCursor });
    } catch (error: any) {
      logger.error({ message: 'Failed to retrieve users', error });
      res.status(500).json({ message: 'Failed to retrieve users' });
    }
  }

  // GET /users/:id
  private async getUserById(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({ route: req.originalUrl, errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = Number(req.params.id);

    try {
      const user = await this.usersService.getById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Authorization: Only self or admin
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        logger.warn({ message: 'Unauthorized access attempt', user: req.user });
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      res.status(200).json({ user });
    } catch (error: any) {
      logger.error({ message: 'Failed to retrieve user', error });
      res.status(500).json({ message: 'Failed to retrieve user' });
    }
  }

  // POST /users/:id/generate-test
  private async generateAITest(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({ route: req.originalUrl, errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = Number(req.params.id);
    const { programOfInterest } = req.body;
    const adminId = req.user?.userId;

    // Authorization: self or admin
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      logger.warn({ message: 'Unauthorized AI test generation attempt', user: req.user });
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    try {
      // Log admin action
      if (req.user?.role === 'admin') {
        await this.pool.query(
          `INSERT INTO admin_logs (admin_id, target_user_id, action_type, program_of_interest) VALUES ($1, $2, $3, $4)`,
          [adminId, userId, 'GENERATE_AI_TEST', programOfInterest]
        );
      }

      // Decide storage: Redis for short-term, Postgres for full
      const useRedis = req.user?.role !== 'admin' && new Date().getFullYear() - req.user!.userId < 3;
      const storageKey = `aiTest:${userId}:${programOfInterest}`;

      if (useRedis) {
        await redis.set(storageKey, JSON.stringify({ status: 'queued', createdAt: new Date().toISOString() }), 'EX', 3600);
      }

      // Queue job in BullMQ
      const job = await aiTestQueue.add('generate-ai-test', {
        userId,
        programOfInterest,
        initiatedByUserId: adminId,
        storageKey,
      }, {
        attempts: 3,
        backoff: 5000,
      });

      res.status(202).json({
        message: 'AI test job queued',
        jobId: job.id,
        statusUrl: `/jobs/${job.id}/status`,
      });
    } catch (error: any) {
      logger.error({ message: 'Failed to queue AI test job', error });
      res.status(500).json({ message: 'Failed to queue AI test job' });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}


// services/auth-service/src/server.ts (Final Version)

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis'; // Ensure ioredis is installed

import { AuditService } from './audit/audit.service';
// Ensure these imports align with your file structure
import { adminAuditMiddleware, requestIdMiddleware, initAuditQueueProcessor } from './audit/adminAuditMiddleware';
import { logger } from './logging/logger';

dotenv.config();

// ---------------------------------------------------
// 1. Core Service Initialization
// ---------------------------------------------------
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    logger.error("FATAL_ERROR: JWT_SECRET is not defined. Service cannot start.");
    process.exit(1);
}

// ---------------------------------------------------
// 2. Database and Services Setup
// ---------------------------------------------------
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const auditService = new AuditService(pool, logger);

// ---------------------------------------------------
// 2b. Redis for Queue & Rate Limiting
// ---------------------------------------------------
const redis = new Redis(process.env.REDIS_URL);

// ---------------------------------------------------
// 3. Global Exception Handling
// ---------------------------------------------------
process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT_EXCEPTION', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED_REJECTION', { reason: String(reason), promise });
});

// ---------------------------------------------------
// 4. Middleware Stack
// ---------------------------------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(requestIdMiddleware);

// Initialize the persistent Redis queue processor once
// (Remember: this ideally runs in a separate worker process in prod)
initAuditQueueProcessor(auditService);

// ---------------------------------------------------
// 5. Rate Limiting Middleware (Enhanced Type Safety)
// ---------------------------------------------------
const rateLimit = (keyPrefix: string, limit: number, windowSec: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // req.ip is guaranteed by express in standardized environments
        const ipAddress = req.ip as string; 
        try {
            const key = `${keyPrefix}:${ipAddress}`;
            // Use HSET/HGET/EXPIRE for efficiency in Redis 
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, windowSec);
            }
            if (count > limit) {
                logger.warn('RATE_LIMIT_EXCEEDED', { ip: ipAddress, route: req.path, correlationId: req.correlationId });
                return res.status(429).json({ message: 'Too many requests. Try later.' });
            }
            next();
        } catch (err) {
            logger.error('RATE_LIMIT_ERROR', { error: err, ip: ipAddress, correlationId: req.correlationId });
            // Fail open: if Redis is down, allow the request to proceed (better than total outage)
            next(); 
        }
    };
};

// Apply rate limiting to login/signup
const authRateLimiter = rateLimit('auth', 10, 60); // 10 req per minute per IP

// ---------------------------------------------------
// 6. Authentication Middleware (Enhanced Type Safety)
// ---------------------------------------------------
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]; // Correct array access
    try {
        const payload: any = jwt.verify(token, JWT_SECRET!);
        req.user = { userId: payload.sub, role: payload.role };
        next();
    } catch {
        logger.warn('AUTHENTICATION_FAILED', { correlationId: req.correlationId });
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// ... (Authentication Routes and Health Check are excellent) ...

// ---------------------------------------------------
// 9. Example Admin Route (with Audit & Anomaly Detection)
// ---------------------------------------------------
app.put(
    '/users/:id',
    authMiddleware,
    adminAuditMiddleware(auditService, 'USER_UPDATE'),
    async (req: Request, res: Response) => {
        const adminId = req.user?.userId;
        if (!adminId) return res.status(403).json({ message: 'Forbidden' }); // Should be caught by authMiddleware but a safe check

        try {
            // Update user
            await pool.query('UPDATE users SET email=$1 WHERE id=$2', [req.body.email, req.params.id]);
            res.json({ success: true, message: `User ${req.params.id} updated.` });

            // --- Anomaly Detection ---
            // This detection logic is now encapsulated and more robust
            const key = `audit:count:${adminId}:${new Date().toISOString().slice(0,16)}`;
            const count = await redis.incr(key);
            if (count === 1) await redis.expire(key, 60);
            if (count > 50) {
                logger.warn('ANOMALY_DETECTED_ADMIN_VELOCITY', { adminId, count, threshold: 50, correlationId: req.correlationId });
            }

        } catch (err) {
            logger.error('USER_UPDATE_ERROR', { error: err, correlationId: req.correlationId });
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ---------------------------------------------------
// 10. Start Server
// ---------------------------------------------------
app.listen(PORT, () => {
    logger.info(`Auth service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});

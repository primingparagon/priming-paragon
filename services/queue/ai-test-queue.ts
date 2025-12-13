// services/auth-service/src/queue/ai-test-queue.ts

import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import { UsersService } from '../users/users.service';
import { Pool } from 'pg';
import Redis from 'ioredis';
import winston from 'winston';

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Queue & Scheduler
export const aiTestQueue = new Queue('ai-test-queue', { connection: redisConnection });
export const aiTestScheduler = new QueueScheduler('ai-test-queue', { connection: redisConnection });

// Job data type
interface AIJobData {
  userId: number;
  programOfInterest: string;
  initiatedByUserId?: number; // adminId if present
  storageKey?: string; // optional Redis key
}

// Worker
export const aiTestWorker = (pool: Pool) => {
  return new Worker(
    'ai-test-queue',
    async (job: Job<AIJobData>) => {
      const { userId, programOfInterest, initiatedByUserId, storageKey } = job.data;

      const usersService = new UsersService(pool);

      try {
        logger.info({ message: 'Processing AI test job', jobId: job.id, userId, programOfInterest });

        // Call AI service (Gemini/OpenAI)
        const testResult = await usersService.generateAITest({ id: userId, programOfInterest });

        // Save completed test to Postgres
        try {
          await pool.query(
            'INSERT INTO ai_tests(user_id, program_of_interest, result, created_at) VALUES($1,$2,$3,NOW())',
            [userId, programOfInterest, JSON.stringify(testResult)]
          );
        } catch (dbError) {
          logger.error({ message: 'Postgres insert failed', userId, programOfInterest, dbError });
          throw dbError;
        }

        // Admin audit log
        if (initiatedByUserId) {
          try {
            await pool.query(
              `INSERT INTO admin_logs(admin_id, target_user_id, action_type, program_of_interest, created_at)
               VALUES($1, $2, $3, $4, NOW())`,
              [initiatedByUserId, userId, 'AI Test Generated', programOfInterest]
            );
          } catch (logError) {
            logger.error({ message: 'Failed to log admin action', jobId: job.id, logError });
          }
        }

        // Redis caching for quick retrieval (optional)
        if (storageKey) {
          await redisConnection.set(
            storageKey,
            JSON.stringify({ status: 'completed', result: testResult, completedAt: new Date().toISOString() }),
            'EX',
            3600
          );
        }

        logger.info({ message: 'AI test job completed', jobId: job.id, userId });
        return testResult;
      } catch (error) {
        logger.error({ message: 'AI test job failed', jobId: job.id, userId, error });
        throw error; // triggers BullMQ retry
      }
    },
    {
      connection: redisConnection,
      concurrency: 4, // configurable
    }
  );
};


import { Queue, Worker, QueueScheduler, Job } from './redis-connection';
import { UsersService } from '../users/users.service';
import { Pool } from 'pg';
import winston from 'winston';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export const aiTestQueue = new Queue('ai-test-queue', { connection: Job.prototype.connection });
export const aiTestScheduler = new QueueScheduler('ai-test-queue', { connection: Job.prototype.connection });

// Worker: process AI test jobs
export const aiTestWorker = (pool: Pool) => {
  return new Worker(
    'ai-test-queue',
    async (job: Job) => {
      const { userId, programOfInterest, adminId } = job.data;

      const usersService = new UsersService(pool);

      try {
        logger.info({ message: 'Processing AI test job', jobId: job.id, userId, programOfInterest });

        // Call AI service (Gemini/OpenAI) - placeholder
        const testResult = await usersService.generateAITest({ id: userId, programOfInterest });

        // Save completed test to Postgres
        await pool.query(
          'INSERT INTO ai_tests(user_id, program_of_interest, result, created_at) VALUES($1,$2,$3,NOW())',
          [userId, programOfInterest, JSON.stringify(testResult)]
        );

        // Log admin action
        await pool.query(
          'INSERT INTO admin_logs(admin_id, target_user_id, action_type, program_of_interest) VALUES($1,$2,$3,$4)',
          [adminId, userId, 'AI Test Generated', programOfInterest]
        );

        logger.info({ message: 'AI test job completed', jobId: job.id, userId });

        return testResult;
      } catch (error) {
        logger.error({ message: 'AI test job failed', jobId: job.id, userId, error });
        throw error; // so Bull can retry
      }
    },
    { connection: Job.prototype.connection, concurrency: 2 }
  );
};

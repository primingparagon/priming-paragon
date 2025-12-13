import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import IORedis from 'ioredis';

// Use default Redis host/port for now
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

export { connection, Queue, Worker, QueueScheduler, Job };

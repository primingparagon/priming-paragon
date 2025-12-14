// services/auth-service/src/security/anomaly-engine.ts

import { Pool } from 'pg';
import { Logger } from 'winston';
import { BigQuery } from '@google-cloud/bigquery';
import { anomalyContext } from './anomaly-context';

export type Signal = {
  name: string;
  score: number;
};

export function scoreAnomaly(signals: Signal[], maxScorePerSignal = 100): number {
  if (!Array.isArray(signals)) return 0;
  return signals.reduce((acc: number, signal: Signal) => {
    if (typeof signal.score !== 'number' || isNaN(signal.score)) return acc;
    return acc + Math.min(signal.score, maxScorePerSignal);
  }, 0);
}

export function scoreAnomalyWithThreshold(
  signals: Signal[],
  threshold = 50
): { total: number; exceeded: boolean } {
  const total = scoreAnomaly(signals);
  return { total, exceeded: total >= threshold };
}

export interface AnomalyLogRow {
  user_id: number | null;
  correlation_id: string | null;
  action_name: string;
  target_resource: string;
  signals: Signal[];
  total_score: number;
  exceeded: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AnomalyHandlerOptions {
  pgPool: Pool;
  logger?: Logger;
  bigQuery?: BigQuery;
  tableName?: string; // BigQuery table
  actionName: string;
  targetResource: string;
  metadata?: Record<string, any>;
  maxScorePerSignal?: number;
  threshold?: number;
  retryCount?: number; // Number of retries
  retryDelayMs?: number; // Base delay for exponential backoff
  batchSize?: number; // Max anomalies to flush at once
}

// -----------------------------
// In-memory anomaly queue for batch logging
// NOTE: Assumes a single, consistent set of logging options across the application instance.
// -----------------------------
const anomalyQueue: AnomalyLogRow[] = [];
let batchTimer: NodeJS.Timeout | null = null;
// Store the global options used for flushing
let globalLoggingOptions: Omit<AnomalyHandlerOptions, 'actionName' | 'targetResource' | 'metadata'> | null = null;


async function flushAnomalies() {
  if (anomalyQueue.length === 0 || !globalLoggingOptions) return;

  const { pgPool, logger, bigQuery, tableName = 'anomaly_logs', retryCount = 3, retryDelayMs = 100, batchSize = 50 } = globalLoggingOptions;
  
  // Use splice to extract the batch and empty those items from the queue
  const batch = anomalyQueue.splice(0, batchSize);

  // Retry mechanism with exponential backoff
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      // Insert batch into Postgres
      const values = batch.map(entry => [
        entry.user_id,
        entry.correlation_id,
        entry.action_name,
        entry.target_resource,
        JSON.stringify(entry.signals),
        entry.total_score,
        entry.exceeded,
        JSON.stringify(entry.metadata),
        entry.created_at
      ]);

      // Dynamically generate placeholders for bulk insert
      const placeholders = values
        .map((_, i) =>
          `($${i * 9 + 1},$${i * 9 + 2},$${i * 9 + 3},$${i * 9 + 4},$${i * 9 + 5},$${i * 9 + 6},$${i * 9 + 7},$${i * 9 + 8},$${i * 9 + 9})`
        )
        .join(',');

      await pgPool.query(
        `INSERT INTO anomaly_logs
         (user_id, correlation_id, action_name, target_resource, signals, total_score, exceeded, metadata, created_at)
         VALUES ${placeholders}`,
        values.flat()
      );

      logger?.info('BATCH_ANOMALY_LOGGED_PG', { batchSize: batch.length, destination: 'Postgres' });

      // Optional BigQuery batch replication
      if (bigQuery) {
        try {
          const dataset = bigQuery.dataset('security');
          // BQ client handles object array insertion directly
          await dataset.table(tableName).insert(batch); 
          logger?.info('BATCH_ANOMALY_REPLICATED_BQ', { batchSize: batch.length, destination: 'BigQuery' });
        } catch (bqErr: unknown) {
          logger?.error('BATCH_ANOMALY_BQ_FAILED', {
            error: bqErr instanceof Error ? bqErr.message : String(bqErr),
            stack: bqErr instanceof Error ? bqErr.stack : undefined
          });
        }
      }
      break; // success, exit retry loop
    } catch (err: unknown) {
      const delay = retryDelayMs * Math.pow(2, attempt);
      logger?.error('BATCH_ANOMALY_LOGGING_RETRY', {
        attempt,
        delay,
        error: err instanceof Error ? err.message : String(err)
      });
      if (attempt < retryCount) {
        await new Promise(r => setTimeout(r, delay));
      } else {
        // If all retries fail, these logs are lost or might be sent to a dead-letter queue (not implemented here)
        logger?.error('BATCH_ANOMALY_LOGGING_FAILED_CRITICAL', {
            batchSize: batch.length,
            error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }
}

/**
 * Handle anomaly logging
 * Enqueues the anomaly and flushes periodically/on batch size limit
 */
export async function handleAnomaly(signals: Signal[], options: AnomalyHandlerOptions) {
  const {
    logger,
    actionName,
    targetResource,
    metadata = {},
    batchSize = 50
  } = options;

  // Set the global options pointer (last one wins in this implementation)
  if (!globalLoggingOptions) {
    // Only pick up relevant global options, stripping runtime specifics
    const { actionName: an, targetResource: tr, metadata: md, ...globalOpts } = options;
    globalLoggingOptions = globalOpts;
  }

  // Define a type for the extended context we expect
  type AnomalyContextStore = {
      userId: number;
      correlationId: string;
      ip?: string;
      route?: string;
      userAgent?: string;
  };
  
  // Extract enriched metadata from AsyncLocalStorage
  const context = anomalyContext.getStore() as AnomalyContextStore | undefined;
  const userId = context?.userId ?? null;
  const correlationId = context?.correlationId ?? null;
  const ip = context?.ip ?? null;
  const route = context?.route ?? null;
  const userAgent = context?.userAgent ?? null;

  const { total: totalScore, exceeded } = scoreAnomalyWithThreshold(signals, options.threshold);

  const createdAt = new Date().toISOString();

  const logEntry: AnomalyLogRow = {
    user_id: userId,
    correlation_id: correlationId,
    action_name: actionName,
    target_resource: targetResource,
    signals,
    total_score: totalScore,
    exceeded,
    // Combine provided metadata with context metadata
    metadata: { ...metadata, ip, route, userAgent }, 
    created_at: createdAt
  };

  // Enqueue for batch logging
  anomalyQueue.push(logEntry);

  // Trigger immediate flush if batch size reached
  if (anomalyQueue.length >= batchSize) {
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }
    // Fire and forget the flush
    void flushAnomalies(); 
  } else if (!batchTimer) {
    // Set timer if not already set (flush every 1 second if queue not empty)
    batchTimer = setTimeout(() => {
      void flushAnomalies().finally(() => {
        batchTimer = null;
      });
    }, 1000); 
  }

  return { totalScore, exceeded };
}

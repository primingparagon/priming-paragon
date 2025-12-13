// services/auth-service/src/security/anomaly-engine.ts

import { Pool } from 'pg';
import { Logger } from 'winston';
import { BigQuery } from '@google-cloud/bigquery';
// Assuming these are in a separate file as per previous prompt structure
import { scoreAnomalyWithThreshold, Signal } from './anomaly.service'; 
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Interface for rows in the anomaly_logs table.
 */
export interface AnomalyLogRow {
  user_id: number;
  correlation_id: string;
  action: string;
  target_resource: string;
  signals: Signal[];
  total_score: number;
  exceeded: boolean;
  created_at: string;
}

// -----------------------------
// Context Storage for request-scoped data
// -----------------------------
// BEST PRACTICE: Use AsyncLocalStorage to manage context transparently
export const anomalyContext = new AsyncLocalStorage<{
  userId: number;
  correlationId: string;
}>();

// -----------------------------
// Options for the anomaly handler
// -----------------------------
export interface AnomalyHandlerOptions {
  pgPool: Pool;                // Postgres connection pool
  bigQuery?: BigQuery;         // Optional BigQuery replication
  logger?: Logger;             // Structured logging
  tableName?: string;          // Optional BigQuery table
  actionName: string;          // e.g., CREATE, UPDATE, DELETE
  targetResource: string;      // e.g., users, roles, audit_logs
}

// -----------------------------
// Core handler function
// -----------------------------
export async function handleAnomaly(
  signals: Signal[],
  options: AnomalyHandlerOptions
) {
  const { pgPool, bigQuery, logger, tableName = 'anomaly_logs', actionName, targetResource } = options;

  // Extract userId and correlationId from the AsyncLocalStorage context (No longer passed as params)
  const context = anomalyContext.getStore();
  // Provide safe defaults if context isn't set (e.g., in a background job)
  const userId = context?.userId ?? 0; 
  const correlationId = context?.correlationId ?? 'unknown';

  const { total, exceeded } = scoreAnomalyWithThreshold(signals);

  const logEntry: AnomalyLogRow = {
    user_id: userId,
    correlation_id: correlationId,
    action: actionName,
    target_resource: targetResource,
    signals,
    total_score: total,
    exceeded,
    created_at: new Date().toISOString()
  };

  try {
    await pgPool.query(
      `INSERT INTO anomaly_logs 
      (user_id, correlation_id, action, target_resource, signals, total_score, exceeded, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, correlationId, actionName, targetResource, JSON.stringify(signals), total, exceeded, logEntry.created_at]
    );

    logger?.info('ANOMALY_LOGGED_PG', { ...logEntry, destination: 'Postgres' });

    if (bigQuery) {
      await bigQuery.dataset('security').table(tableName).insert([logEntry]);
      logger?.info('ANOMALY_REPLICATED_TO_BIGQUERY', { userId, correlationId, destination: 'BigQuery' });
    }

  } catch (err: unknown) {
    logger?.error('ANOMALY_LOGGING_FAILED', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      userId,
      correlationId
    });
  }

  return { total, exceeded };
}

// -----------------------------
// Higher-order wrapper for admin actions
// -----------------------------
export function withAdminAnomalyLogging<
  F extends (...args: any[]) => Promise<any>
>(
  fn: F,
  generateSignals: (args: Parameters<F>, result: Awaited<ReturnType<F>>) => Signal[],
  // Options now *omits* the runtime dependencies that are assumed to be on `this` or context-managed
  options: Omit<AnomalyHandlerOptions, 'pgPool' | 'logger' | 'bigQuery'> 
) {
  return async function wrapped(this: any, ...args: Parameters<F>) {
    // Execute the main business logic
    const result = await fn.apply(this, args);
    
    // Generate signals based on input args and result
    const signals = generateSignals(args, result);

    // Run anomaly logging asynchronously (fire and forget)
    // Assumes pgPool/logger/bigQuery are available on the 'this' context of the wrapped class instance
    const anomalyOptions: AnomalyHandlerOptions = {
      ...options,
      pgPool: this.pool, // Assumed property
      logger: this.logger, // Assumed property
      bigQuery: (this as any).bigQuery // Assumed property
    };

    handleAnomaly(signals, anomalyOptions).catch(err => {
      // Log the failure internally without stopping the main request flow
      this.logger?.error('ASYNC_ANOMALY_LOGGING_FAILED', { error: err });
    });

    return result;
  };
}

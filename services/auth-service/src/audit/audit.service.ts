// services/auth-service/src/audit/audit.service.ts

import { Pool, QueryResult } from 'pg';
import winston from 'winston';

/**
 * Interface for the structured data required to log an admin action.
 */
export interface AdminActionData {
  adminId: number;
  targetUserId: number;
  actionType: string;
  programOfInterest?: string | null;
  details?: Record<string, any> | null;
}

/**
 * Shape of the DB response when inserting an audit log.
 * Using QueryResult<T> gives us typed verification.
 */
interface AuditInsertResult {
  id: string; // BIGSERIAL returns string in pg
}

export class AuditService {
  constructor(
    private readonly pool: Pool,
    private readonly logger: winston.Logger
  ) {}

  /**
   * Logs an administrative action to runtime logs and the permanent audit trail.
   * Designed for SOC-2 / FERPA compliance and forensic integrity.
   */
  async logAdminAction(data: AdminActionData): Promise<void> {
    // -----------------------------
    // Defensive Validation (Critical)
    // -----------------------------
    const isValid =
  Number.isInteger(data.adminId) &&
  Number.isInteger(data.targetUserId) &&
  data.adminId > 0 &&
  data.targetUserId > 0 &&
  typeof data.actionType === 'string' &&
  data.actionType.trim().length > 0;

if (!isValid) {
  this.logger.error('AUDIT_LOG_VALIDATION_FAILED', {
    reason: 'Input payload invalid',
    data,
  });
  return; // Exit early
}

    // -----------------------------
    // Runtime Monitoring
    // -----------------------------
    this.logger.info({
      event: 'ADMIN_ACTION',
      adminId: data.adminId,
      targetUserId: data.targetUserId,
      actionType: data.actionType,
      programOfInterest: data.programOfInterest ?? null,
    });

    try {
      // -----------------------------
      // Permanent Audit Trail Insert
      // -----------------------------
      const query = `
        INSERT INTO admin_logs (
          admin_id,
          target_user_id,
          action_type,
          program_of_interest,
          details
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const values = [
        data.adminId,
        data.targetUserId,
        data.actionType,
        data.programOfInterest ?? null,
        data.details ?? null, // JSONB accepts native objects
      ];

      const result: QueryResult<AuditInsertResult> =
        await this.pool.query(query, values);

      // -----------------------------
      // Success Correlation
      // -----------------------------
      this.logger.info({
        event: 'ADMIN_ACTION_AUDIT_COMMITTED',
        auditLogId: result.rows[0]?.id,
        adminId: data.adminId,
        actionType: data.actionType,
      });

    } catch (error) {
      // -----------------------------
      // Failure Visibility (Never Silent)
      // -----------------------------
      this.logger.error('AUDIT_LOG_WRITE_FAILURE', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        auditPayload: data,
      });

      // Do NOT throw — audit logging should not break business flows.
      // Alerting should be handled by log monitoring.
    }
  }
}

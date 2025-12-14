// services/auth-service/src/audit/audit.service.ts

import { Pool, QueryResult } from 'pg';
import winston from 'winston';

/**
 * Utility function to generate a cryptographic hash of an audit log entry, 
 * incorporating the previous entry's hash for a tamper-evident chain.
 * This function is assumed to be defined elsewhere (e.g., a crypto utility file).
 */
function hashAuditEntry(logData: AdminActionData, previousHash: string | null): string {
    // In a real implementation, this would use Node's crypto module (e.g., SHA256)
    // to hash a canonical JSON representation of logData + previousHash + timestamp.
    // return crypto.createHash('sha256').update(JSON.stringify({ ...logData, previousHash })).digest('hex');
    console.log("Placeholder for cryptographic hashing utility.");
    return `dummy_hash_${Math.random().toString(36).substring(2, 9)}`;
}


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
  hash: string;
}

export class AuditService {
  constructor(
    private readonly pool: Pool,
    private readonly logger: winston.Logger
  ) {}

  /**
   * Logs an administrative action to runtime logs and the permanent audit trail.
   * Designed for SOC-2 / FERPA compliance and forensic integrity via hashing chain.
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
      return; // Exit early if input is invalid
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
      // 1. Fetch the hash of the previous log entry
      // -----------------------------
      const prevResult: QueryResult<{hash: string}> = await this.pool.query(
        'SELECT hash FROM admin_logs ORDER BY created_at DESC, id DESC LIMIT 1'
      );

      const previousHash: string | null = prevResult.rows[0]?.hash ?? null;

      // -----------------------------
      // 2. Calculate the hash for the new entry (Tamper-evident chain)
      // -----------------------------
      const currentHash = hashAuditEntry(data, previousHash);

      // -----------------------------
      // 3. Permanent Audit Trail Insert
      // -----------------------------
      const query = `
        INSERT INTO admin_logs (
          admin_id,
          target_user_id,
          action_type,
          program_of_interest,
          details,
          previous_hash, -- New column required
          hash,          -- New column required
          created_at     -- Ensure created_at is captured consistently
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, hash
      `;

      const values = [
        data.adminId,
        data.targetUserId,
        data.actionType,
        data.programOfInterest ?? null,
        data.details ?? null,
        previousHash,
        currentHash,
      ];

      const result: QueryResult<AuditInsertResult> = await this.pool.query(query, values);

      // -----------------------------
      // Success Correlation
      // -----------------------------
      this.logger.info({
        event: 'ADMIN_ACTION_AUDIT_COMMITTED',
        auditLogId: result.rows[0]?.id,
        newHash: result.rows[0]?.hash,
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

      // Do NOT throw — audit logging failure should not break business flows.
      // Alerting should be handled by log monitoring system.
    }
  }
}

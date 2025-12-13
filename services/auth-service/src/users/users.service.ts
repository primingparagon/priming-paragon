// services/auth-service/src/users/users.service.ts

import { Pool, QueryResult } from 'pg';
import { User, UserDatabaseRecord } from './user.entity';
import winston from 'winston';

/**
 * Structured Logger
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export class UsersService {
  constructor(private pool: Pool) {}

  /* =========================================================================
     USER READ OPERATIONS
     ========================================================================= */

  /**
   * Cursor-based pagination (preferred for large datasets)
   * Requires an index on users(id)
   */
  async getAll(
    limit: number = 50,
    cursor?: number
  ): Promise<User[]> {
    try {
      const query = cursor
        ? `
          SELECT id, email, role, created_at
          FROM users
          WHERE id > $1
          ORDER BY id ASC
          LIMIT $2
        `
        : `
          SELECT id, email, role, created_at
          FROM users
          ORDER BY id ASC
          LIMIT $1
        `;

      const values = cursor ? [cursor, limit] : [limit];

      const result: QueryResult<User> = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error({ message: 'DB Error in getAll (cursor)', error });
      throw new Error('Database query failed');
    }
  }

  /**
   * Offset-based pagination (legacy / compatibility)
   */
  async getAllOffset(
    limit: number = 50,
    offset: number = 0
  ): Promise<User[]> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        `
        SELECT id, email, role, created_at
        FROM users
        ORDER BY id ASC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      logger.error({ message: 'DB Error in getAllOffset', error });
      throw new Error('Database query failed');
    }
  }

  async getById(id: number): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        `
        SELECT id, email, role, created_at
        FROM users
        WHERE id = $1
        `,
        [id]
      );
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      logger.error({ message: 'DB Error in getById', id, error });
      throw new Error('Database query failed');
    }
  }

  /**
   * Safe public lookup (no password)
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        `
        SELECT id, email, role, created_at
        FROM users
        WHERE email = $1
        `,
        [email]
      );
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      logger.error({ message: 'DB Error in getByEmail', email, error });
      throw new Error('Database query failed');
    }
  }

  /**
   * INTERNAL ONLY — includes password hash
   * Used by AuthService
   */
  async getByEmailWithPassword(
    email: string
  ): Promise<UserDatabaseRecord | null> {
    try {
      const result: QueryResult<UserDatabaseRecord> = await this.pool.query(
        `
        SELECT id, email, password, role, created_at
        FROM users
        WHERE email = $1
        `,
        [email]
      );
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      logger.error({
        message: 'DB Error in getByEmailWithPassword',
        email,
        error,
      });
      throw new Error('Database query failed');
    }
  }

  /* =========================================================================
     ADMIN OPERATIONS
     ========================================================================= */

  async updateRole(
    userId: number,
    role: 'user' | 'admin'
  ): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        `
        UPDATE users
        SET role = $1
        WHERE id = $2
        RETURNING id, email, role, created_at
        `,
        [role, userId]
      );

      if (result.rows.length) {
        logger.info({
          message: 'User role updated',
          userId,
          newRole: role,
        });
      }

      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      logger.error({
        message: 'DB Error in updateRole',
        userId,
        role,
        error,
      });
      throw new Error('Database update failed');
    }
  }

  /* =========================================================================
     AI TEST GENERATION (ASYNC-FRIENDLY)
     ========================================================================= */

  /**
   * Placeholder for AI-generated tests
   * Intended to be executed by BullMQ workers
   */
  async generateAITest(userProfile: {
    id: number;
    programOfInterest: string;
  }): Promise<any> {
    logger.info({
      message: 'Generating AI test',
      userId: userProfile.id,
      programOfInterest: userProfile.programOfInterest,
    });

    // TODO:
    // - Call Gemini / OpenAI
    // - Store results
    // - Return job-safe payload

    return {
      status: 'generated',
      userId: userProfile.id,
      programOfInterest: userProfile.programOfInterest,
      generatedAt: new Date().toISOString(),
    };
  }
}

  // Placeholder for dynamic AI-generated tests
  async generateAITest(userProfile: any): Promise<any> {
    // This will call Gemini / OpenAI models using the userProfile data
    // Implementation: Call AI API with userProfile -> returns test JSON
    return { message: 'AI test generated dynamically', profile: userProfile };
  }
}

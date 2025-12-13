// services/auth-service/src/users/users.service.ts
import { Pool, QueryResult } from 'pg';
import { User, UserDatabaseRecord } from './user.entity';
import winston from 'winston';

// Structured Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export class UsersService {
  constructor(private pool: Pool) {}

  async getAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users ORDER BY id ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      logger.error({ message: 'DB Error in getAll', error });
      throw new Error('Database query failed');
    }
  }

  async getById(id: number): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users WHERE id=$1',
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error({ message: 'DB Error in getById', error });
      throw new Error('Database query failed');
    }
  }

  async getByEmail(email: string): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users WHERE email=$1',
        [email]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error({ message: 'DB Error in getByEmail', error });
      throw new Error('Database query failed');
    }
  }

  // Placeholder for dynamic AI-generated tests
  async generateAITest(userProfile: any): Promise<any> {
    // This will call Gemini / OpenAI models using the userProfile data
    // Implementation: Call AI API with userProfile -> returns test JSON
    return { message: 'AI test generated dynamically', profile: userProfile };
  }
}

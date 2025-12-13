// services/auth-service/src/users/users.service.ts

import { Pool, QueryResult } from 'pg';
import { User } from './user.entity';

export class UsersService {
  constructor(private pool: Pool) {}

  /**
   * Retrieve all users (without passwords)
   */
  async getAll(): Promise<User[]> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users ORDER BY id ASC'
      );
      return result.rows;
    } catch (error) {
      console.error('DB Error in getAll:', error);
      throw new Error('Database query failed');
    }
  }

  /**
   * Retrieve a single user by ID
   */
  async getById(id: number): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users WHERE id=$1',
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('DB Error in getById:', error);
      throw new Error('Database query failed');
    }
  }

  /**
   * Optional: Retrieve a user by email (for internal use)
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      const result: QueryResult<User> = await this.pool.query(
        'SELECT id, email, created_at FROM users WHERE email=$1',
        [email]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('DB Error in getByEmail:', error);
      throw new Error('Database query failed');
    }
  }
}

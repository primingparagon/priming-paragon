import { Pool, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../users/user.entity';

interface JwtPayload {
  userId: number;
  email: string;
  role?: string;
}

export class AuthService {
  constructor(private pool: Pool) {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY environment variable is not set.');
    }
  }

  async register(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result: QueryResult<User> = await this.pool.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'user')
       RETURNING id, email, role, created_at`,
      [email, hashedPassword]
    );

    return result.rows[0];
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT id, email, password, role, created_at
       FROM users WHERE email=$1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    delete user.password;
    return user;
  }

  generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id!,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET_KEY!, {
      expiresIn: '1h',
    });
  }
}


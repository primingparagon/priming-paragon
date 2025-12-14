export interface UserDatabaseRecord {
  id?: number;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  created_at?: Date; // Or use 'string' if using ISO strings over API/in DB results
}

/**
 * Represents a user object safe for client consumption (password omitted).
 */
export type User = Omit<UserDatabaseRecord, 'password'>;

/**
 * Represents the input required to create a new user (omits generated fields).
 */
export type NewUser = Omit<UserDatabaseRecord, 'id' | 'created_at'>;

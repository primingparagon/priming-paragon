export interface UserDatabaseRecord {
  id?: number;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  created_at?: Date;
}

export type User = Omit<UserDatabaseRecord, 'password'>;

export type NewUser = Omit<UserDatabaseRecord, 'id' | 'created_at'>;


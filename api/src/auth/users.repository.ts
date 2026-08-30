import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { UserRow } from './auth.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  findByEmail(email: string): Promise<UserRow | undefined> {
    return this.db.queryOne<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  }

  findById(id: string): Promise<UserRow | undefined> {
    return this.db.queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async create(email: string, passwordHash: string): Promise<UserRow> {
    const row = await this.db.queryOne<UserRow>(
      `INSERT INTO users (email, password_hash)
       VALUES (lower($1), $2)
       RETURNING *`,
      [email, passwordHash],
    );
    return row!;
  }

  async setSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      `UPDATE users
          SET session_token_hash = $2,
              session_expires_at = $3,
              updated_at = now()
        WHERE id = $1`,
      [userId, tokenHash, expiresAt],
    );
  }

  findByLiveSessionToken(tokenHash: string): Promise<UserRow | undefined> {
    return this.db.queryOne<UserRow>(
      `SELECT * FROM users
        WHERE session_token_hash = $1
          AND session_expires_at > now()`,
      [tokenHash],
    );
  }

  async clearSession(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE users
          SET session_token_hash = NULL,
              session_expires_at = NULL,
              updated_at = now()
        WHERE id = $1`,
      [userId],
    );
  }
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CorsOriginRow } from './cors.types';

@Injectable()
export class CorsOriginsRepository {
  constructor(private readonly db: DatabaseService) {}

  async listEnabled(): Promise<string[]> {
    const rows = await this.db.query<{ origin: string }>(
      'SELECT origin FROM cors_origins WHERE enabled ORDER BY origin',
    );
    return rows.map((r) => r.origin);
  }

  listAll(): Promise<CorsOriginRow[]> {
    return this.db.query<CorsOriginRow>('SELECT * FROM cors_origins ORDER BY origin');
  }
}

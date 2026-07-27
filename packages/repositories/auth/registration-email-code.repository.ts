import { inject, injectable } from 'tsyringe';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { registrationEmailCodes } from '@core/models/auth/registrationEmailCode.model.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';

export type RegistrationEmailCode = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
};

function mapCode(row: typeof registrationEmailCodes.$inferSelect): RegistrationEmailCode {
  return { id: row.id, email: row.email, codeHash: row.code_hash, attempts: row.attempts, expiresAt: row.expires_at, createdAt: row.created_at };
}

@injectable()
export class RegistrationEmailCodeRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}

  async findLatestActiveByEmail(email: string): Promise<RegistrationEmailCode | null> {
    const rows = await this.db.select().from(registrationEmailCodes).where(and(eq(registrationEmailCodes.email, email), isNull(registrationEmailCodes.consumed_at))).orderBy(desc(registrationEmailCodes.created_at)).limit(1);
    return rows[0] ? mapCode(rows[0]) : null;
  }

  async invalidateActiveForEmail(email: string): Promise<void> {
    await this.db.update(registrationEmailCodes).set({ consumed_at: new Date().toISOString() }).where(and(eq(registrationEmailCodes.email, email), isNull(registrationEmailCodes.consumed_at)));
  }

  async create(email: string, codeHash: string, expiresAt: string): Promise<void> {
    await this.db.insert(registrationEmailCodes).values({ id: createUuidV7(), email, code_hash: codeHash, expires_at: expiresAt });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.db.update(registrationEmailCodes).set({ attempts: sql`${registrationEmailCodes.attempts} + 1` }).where(eq(registrationEmailCodes.id, id));
  }

  async consume(id: string): Promise<void> {
    await this.db.update(registrationEmailCodes).set({ consumed_at: new Date().toISOString() }).where(eq(registrationEmailCodes.id, id));
  }
}

import { inject, injectable } from 'tsyringe';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { passwordResetCodes } from '@core/models/auth/passwordResetCode.model.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';

export type PasswordResetCode = {
  id: string;
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
};

function mapCode(
  row: typeof passwordResetCodes.$inferSelect
): PasswordResetCode {
  return {
    id: row.id,
    userId: row.user_id,
    codeHash: row.code_hash,
    attempts: row.attempts,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

@injectable()
export class PasswordResetCodeRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}

  async findLatestActiveByUserId(
    userId: string
  ): Promise<PasswordResetCode | null> {
    const rows = await this.db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.user_id, userId),
          isNull(passwordResetCodes.consumed_at)
        )
      )
      .orderBy(desc(passwordResetCodes.created_at))
      .limit(1);
    return rows[0] ? mapCode(rows[0]) : null;
  }

  async invalidateActiveForUser(userId: string): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ consumed_at: new Date().toISOString() })
      .where(
        and(
          eq(passwordResetCodes.user_id, userId),
          isNull(passwordResetCodes.consumed_at)
        )
      );
  }

  async create(
    userId: string,
    codeHash: string,
    expiresAt: string
  ): Promise<void> {
    await this.db.insert(passwordResetCodes).values({
      id: createUuidV7(),
      user_id: userId,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ attempts: sql`${passwordResetCodes.attempts} + 1` })
      .where(eq(passwordResetCodes.id, id));
  }

  async consume(id: string): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ consumed_at: new Date().toISOString() })
      .where(eq(passwordResetCodes.id, id));
  }
}

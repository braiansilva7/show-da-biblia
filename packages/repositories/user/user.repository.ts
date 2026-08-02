import { inject, injectable } from 'tsyringe';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { users } from '@core/models/user/user.model.js';
import { playerProgress } from '@core/models/player/playerProgress.model.js';
import { questions } from '@core/models/question/question.model.js';
import type {
  LanguageCode,
  User,
  UserListItem,
} from '@core/common/types/user.js';
import { PermissionRepository } from '@core/repositories/permission/permission.repository.js';
import { toPublicUser } from '@core/common/functions/to-public-user.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';
import type { IListUsersInput } from '@core/interfaces/user/IListUsersInput.js';

function mapLanguage(value: string): LanguageCode {
  return value === 'en' || value === 'es' ? value : 'pt-BR';
}

async function mapUser(
  row: typeof users.$inferSelect,
  permissions: PermissionRepository,
  db: AppDatabase
): Promise<User> {
  const permissionRole = await permissions.roleForUser(row.id);
  if (!permissionRole) throw new Error('User permission assignment not found');
  const [progress] = await db
    .select({ highestUnlockedLevel: playerProgress.highest_unlocked_level })
    .from(playerProgress)
    .where(eq(playerProgress.user_id, row.id))
    .limit(1);
  const bestTime = await db.execute<{ best_time_seconds: number | string }>(sql`
    SELECT EXTRACT(EPOCH FROM finished_at - started_at)::int AS best_time_seconds
    FROM game_sessions
    WHERE user_id=${row.id} AND status='FINISHED' AND finished_at IS NOT NULL
    ORDER BY score DESC,
      (SELECT count(*) FROM session_questions WHERE game_session_id=game_sessions.id AND is_correct=TRUE) DESC,
      finished_at - started_at ASC,
      finished_at ASC
    LIMIT 1
  `);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    sessionVersion: row.session_version,
    permissionRoleId: permissionRole.id,
    permissionRole,
    permissions: permissionRole.permissions,
    countryId: row.country_id,
    languageCode: mapLanguage(row.language_code),
    profilePictureUrl: row.profile_picture_url,
    totalScore: row.total_score,
    highestUnlockedLevel:
      progress?.highestUnlockedLevel === 2 ||
      progress?.highestUnlockedLevel === 3
        ? progress.highestUnlockedLevel
        : 1,
    bestTimeSeconds: bestTime.rows[0]
      ? Number(bestTime.rows[0].best_time_seconds)
      : null,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@injectable()
export class UserRepository {
  constructor(
    @inject('DatabaseRw') private readonly db: AppDatabase,
    @inject(PermissionRepository)
    private readonly permissions: PermissionRepository
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return rows[0] ? mapUser(rows[0], this.permissions, this.db) : null;
  }

  async existsByUsername(
    username: string,
    excludingUserId?: string
  ): Promise<boolean> {
    const usernameCondition = sql`lower(${users.username}) = ${username.toLowerCase()}`;
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        excludingUserId
          ? and(usernameCondition, ne(users.id, excludingUserId))
          : usernameCondition
      )
      .limit(1);
    return rows.length > 0;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ? mapUser(rows[0], this.permissions, this.db) : null;
  }

  async list(input: IListUsersInput): Promise<{
    users: UserListItem[];
    total: number;
  }> {
    const search = input.search?.trim().toLowerCase();
    const where = search
      ? sql`(
          lower(${users.username}) like ${`%${search}%`}
          or lower(${users.email}) like ${`%${search}%`}
        )`
      : undefined;
    const rows = await this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.created_at), users.username)
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    const [count] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(where);

    return {
      users: await Promise.all(
        rows.map(async (row) =>
          toPublicUser(await mapUser(row, this.permissions, this.db))
        )
      ),
      total: count?.total ?? 0,
    };
  }

  async create(input: {
    username: string;
    email: string;
    passwordHash: string;
    permissionRoleId: string;
    languageCode: LanguageCode;
    countryId: string;
    profilePictureUrl?: string | null;
    active?: boolean;
  }): Promise<UserListItem> {
    const [row] = await this.db
      .insert(users)
      .values({
        id: createUuidV7(),
        username: input.username,
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        language_code: input.languageCode,
        country_id: input.countryId,
        profile_picture_url: input.profilePictureUrl ?? null,
        active: input.active ?? true,
      })
      .returning();
    await this.permissions.assign(row.id, input.permissionRoleId);
    return toPublicUser(await mapUser(row, this.permissions, this.db));
  }

  async update(
    id: string,
    input: Partial<{
      username: string;
      email: string;
      passwordHash: string;
      permissionRoleId: string;
      languageCode: LanguageCode;
      countryId: string;
      profilePictureUrl: string | null;
      active: boolean;
      incrementSessionVersion: boolean;
    }>
  ): Promise<UserListItem | null> {
    const currentLanguage =
      input.languageCode === undefined
        ? undefined
        : (
            await this.db
              .select({ languageCode: users.language_code })
              .from(users)
              .where(eq(users.id, id))
              .limit(1)
          )[0]?.languageCode;
    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.username !== undefined) patch.username = input.username;
    if (input.email !== undefined) patch.email = input.email.toLowerCase();
    if (input.passwordHash !== undefined)
      patch.password_hash = input.passwordHash;
    if (input.languageCode !== undefined)
      patch.language_code = input.languageCode;
    if (input.countryId !== undefined) patch.country_id = input.countryId;
    if (input.profilePictureUrl !== undefined)
      patch.profile_picture_url = input.profilePictureUrl;
    if (input.active !== undefined) patch.active = input.active;
    if (!Object.keys(patch).length) return null;

    const [row] = await this.db
      .update(users)
      .set(
        input.incrementSessionVersion
          ? { ...patch, session_version: sql`${users.session_version} + 1` }
          : patch
      )
      .where(eq(users.id, id))
      .returning();
    if (!row) return null;
    if (
      input.languageCode !== undefined &&
      currentLanguage !== undefined &&
      currentLanguage !== input.languageCode
    ) {
      await this.db.execute(sql`
        UPDATE game_sessions
        SET status='ABANDONED', finished_at=NOW(), end_reason=NULL
        WHERE user_id=${id} AND status='IN_PROGRESS'
      `);
    }
    if (input.permissionRoleId !== undefined)
      await this.permissions.assign(id, input.permissionRoleId);
    return toPublicUser(await mapUser(row, this.permissions, this.db));
  }

  async resetPassword(id: string, passwordHash: string): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({
        password_hash: passwordHash,
        session_version: sql`${users.session_version} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ? mapUser(row, this.permissions, this.db) : null;
  }

  async deleteWithDependencies(
    id: string,
    executorId: string
  ): Promise<{ deleted: boolean; profilePictureUrl: string | null }> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ profilePictureUrl: users.profile_picture_url })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!current) return { deleted: false, profilePictureUrl: null };

      await tx
        .update(questions)
        .set({ created_by_user_id: executorId })
        .where(eq(questions.created_by_user_id, id));
      await tx.execute(sql`
        DELETE FROM score_events
        WHERE user_id=${id}
           OR game_session_id IN (
             SELECT id FROM game_sessions WHERE user_id=${id}
           )
      `);
      await tx.execute(sql`DELETE FROM game_sessions WHERE user_id=${id}`);
      const deleted = await tx
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });

      return {
        deleted: deleted.length === 1,
        profilePictureUrl: current.profilePictureUrl,
      };
    });
  }
}

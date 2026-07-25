import { inject, injectable } from 'tsyringe';
import { sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import type { DashboardSummary } from '@core/common/types/dashboard.js';

@injectable()
export class DashboardRepository {
  constructor(@inject('DatabaseRo') private readonly db: AppDatabase) {}

  async summary(): Promise<DashboardSummary> {
    const result = await this.db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM users WHERE active) AS active_users,
        (SELECT count(*)::int FROM questions WHERE status = 'PUBLISHED') AS published_questions,
        (SELECT count(*)::int FROM questions WHERE status = 'PUBLISHED' AND difficulty_level = 1) AS easy_questions,
        (SELECT count(*)::int FROM questions WHERE status = 'PUBLISHED' AND difficulty_level = 2) AS medium_questions,
        (SELECT count(*)::int FROM questions WHERE status = 'PUBLISHED' AND difficulty_level = 3) AS hard_questions,
        (SELECT count(*)::int FROM game_sessions WHERE status = 'FINISHED') AS finished_games,
        (SELECT coalesce(sum(total_score), 0)::int FROM users) AS total_score
    `);
    const row = result.rows[0] as Record<string, number>;
    return {
      activeUsers: row.active_users,
      publishedQuestions: row.published_questions,
      questionsByDifficulty: {
        easy: row.easy_questions,
        medium: row.medium_questions,
        hard: row.hard_questions,
      },
      finishedGames: row.finished_games,
      totalScore: row.total_score,
    };
  }
}

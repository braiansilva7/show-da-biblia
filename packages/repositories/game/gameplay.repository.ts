import { inject, injectable } from 'tsyringe';
import { sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';
import type {
  IAnswerQuestionInput,
  IFinishGameInput,
  IStartGameInput,
  IRankingInput,
} from '@core/interfaces/game/IGameplayInput.js';

type S = {
  id: string;
  user_id: string;
  language_code: 'pt-BR' | 'en' | 'es';
  current_level: number;
  score: number;
  skips_remaining: number;
  status: string;
  started_at: string | Date;
  finished_at: string | Date | null;
  end_reason: string | null;
};
type JokerSummary = {
  code: 'ELIMINATE_1' | 'ELIMINATE_2' | 'ELIMINATE_3' | 'REVEAL_ANSWER';
  quantity_available: number;
  quantity_used: number;
};
const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : v);
const summary = (
  s: S,
  correct: number,
  answered: number,
  jokers: JokerSummary[],
  highestUnlockedLevel: number
) => ({
  id: s.id,
  status: s.status,
  end_reason: s.end_reason,
  score: s.score,
  correct_answers: correct,
  answered_questions: answered,
  skips_used: 3 - s.skips_remaining,
  jokers,
  highest_unlocked_level: highestUnlockedLevel,
  started_at: iso(s.started_at),
  finished_at: s.finished_at ? iso(s.finished_at) : null,
  duration_seconds: s.finished_at
    ? Math.max(
        0,
        Math.floor(
          (new Date(s.finished_at).getTime() -
            new Date(s.started_at).getTime()) /
            1000
        )
      )
    : null,
});

@injectable()
export class GameplayRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}
  private async question(
    tx: any,
    sessionId: string,
    language: string,
    level: number,
    order: number
  ) {
    const q = await tx.execute(
      sql`SELECT q.id, qt.statement FROM questions q JOIN question_translations qt ON qt.question_id=q.id AND qt.language_code=${language} WHERE q.status='PUBLISHED' AND q.difficulty_level=${level} AND NOT EXISTS (SELECT 1 FROM session_questions sq WHERE sq.game_session_id=${sessionId} AND sq.question_id=q.id) ORDER BY random() LIMIT 1`
    );
    if (!q.rows[0]) throw new Error('GAME_SESSION_NO_NEXT_QUESTION');
    const a = await tx.execute(
      sql`SELECT ao.id,ao.position,aot.content FROM answer_options ao JOIN answer_option_translations aot ON aot.answer_option_id=ao.id AND aot.language_code=${language} WHERE ao.question_id=${q.rows[0].id} ORDER BY ao.position`
    );
    if (a.rows.length !== 4) throw new Error('GAME_SESSION_NO_NEXT_QUESTION');
    const id = createUuidV7();
    const now = new Date();
    await tx.execute(
      sql`INSERT INTO session_questions (id,game_session_id,question_id,difficulty_level,order_number,status,presented_at) VALUES (${id},${sessionId},${q.rows[0].id},${level},${order},'PENDING',${now})`
    );
    return {
      session_question_id: id,
      order_number: order,
      difficulty_level: level,
      presented_at: now.toISOString(),
      statement: q.rows[0].statement,
      answers: a.rows,
    };
  }
  private async jokers(tx: any, sessionId: string): Promise<JokerSummary[]> {
    const result = await tx.execute(sql`
      SELECT jt.code, sj.quantity_available, sj.quantity_used
      FROM session_jokers sj
      INNER JOIN joker_types jt ON jt.id = sj.joker_type_id
      WHERE sj.game_session_id = ${sessionId}
      ORDER BY jt.code
    `);
    return result.rows as JokerSummary[];
  }
  private async answerFeedback(tx: any, questionId: string, language: string) {
    const result = await tx.execute(sql`
      SELECT ao.id, qt.explanation
      FROM answer_options ao
      INNER JOIN question_translations qt
        ON qt.question_id = ao.question_id AND qt.language_code = ${language}
      WHERE ao.question_id = ${questionId} AND ao.is_correct = TRUE
      LIMIT 1
    `);
    const answer = result.rows[0];
    if (!answer) throw new Error('GAME_ANSWER_INVALID');
    return {
      correct_answer_option_id: answer.id,
      explanation: String(answer.explanation),
    };
  }
  async start(input: IStartGameInput) {
    return this.db.transaction(async (tx) => {
      const u = await tx.execute(
        sql`SELECT language_code FROM users WHERE id=${input.userId} AND active=TRUE FOR UPDATE`
      );
      if (!u.rows[0]) throw new Error('GAME_SESSION_NOT_FOUND');
      await tx.execute(sql`
        UPDATE game_sessions
        SET status='ABANDONED', finished_at=NOW(), end_reason=NULL
        WHERE user_id=${input.userId} AND status='IN_PROGRESS'
      `);
      const id = createUuidV7();
      await tx.execute(
        sql`INSERT INTO game_sessions (id,user_id,language_code) VALUES (${id},${input.userId},${u.rows[0].language_code})`
      );
      const e = await tx.execute<any>(
        sql`SELECT id FROM joker_types WHERE active AND code IN ('ELIMINATE_1','ELIMINATE_2','ELIMINATE_3') ORDER BY random() LIMIT 1`
      );
      const r = await tx.execute<any>(
        sql`SELECT id FROM joker_types WHERE active AND code='REVEAL_ANSWER'`
      );
      if (!e.rows[0] || !r.rows[0])
        throw new Error('GAME_JOKER_TYPE_NOT_FOUND');
      await tx.execute(
        sql`INSERT INTO session_jokers (id,game_session_id,joker_type_id,quantity_available,quantity_used) VALUES (${createUuidV7()},${id},${e.rows[0].id},${input.eliminationQuantity},0),(${createUuidV7()},${id},${r.rows[0].id},${input.revealQuantity},0)`
      );
      const question = await this.question(
        tx,
        id,
        String(u.rows[0].language_code),
        1,
        1
      );
      return {
        session: {
          id,
          current_level: 1,
          score: 0,
          skips_remaining: 3,
          status: 'IN_PROGRESS',
        },
        question,
        jokers: await this.jokers(tx, id),
      };
    });
  }
  private async close(tx: any, s: S, reason: string) {
    const now = new Date();
    await tx.execute(
      sql`UPDATE game_sessions SET status='FINISHED',finished_at=${now},end_reason=${reason} WHERE id=${s.id}`
    );
    const c = await tx.execute(
      sql`SELECT count(*) FILTER (WHERE is_correct=TRUE)::int correct,count(*) FILTER (WHERE status='ANSWERED')::int answered FROM session_questions WHERE game_session_id=${s.id}`
    );
    const correct = Number(c.rows[0].correct),
      answered = Number(c.rows[0].answered);
    await tx.execute(
      sql`UPDATE player_progress SET total_correct_answers=total_correct_answers+${correct},total_questions_answered=total_questions_answered+${answered},highest_unlocked_level=GREATEST(highest_unlocked_level,${correct >= 20 ? 3 : correct >= 10 ? 2 : 1}) WHERE user_id=${s.user_id}`
    );
    await tx.execute(
      sql`UPDATE users SET total_score=COALESCE((SELECT MAX(score) FROM game_sessions WHERE user_id=${s.user_id} AND status='FINISHED'),0) WHERE id=${s.user_id}`
    );
    const progress = await tx.execute(sql`
      SELECT highest_unlocked_level FROM player_progress WHERE user_id=${s.user_id}
    `);
    return summary(
      { ...s, status: 'FINISHED', finished_at: now, end_reason: reason },
      correct,
      answered,
      await this.jokers(tx, s.id),
      Number(progress.rows[0]?.highest_unlocked_level ?? 1)
    );
  }
  async answer(input: IAnswerQuestionInput) {
    return this.db.transaction(async (tx) => {
      const sr = await tx.execute<S>(
        sql`SELECT * FROM game_sessions WHERE id=${input.sessionId} AND user_id=${input.userId} FOR UPDATE`
      );
      const s = sr.rows[0];
      if (!s) throw new Error('GAME_SESSION_NOT_FOUND');
      if (s.status !== 'IN_PROGRESS')
        throw new Error('GAME_SESSION_NOT_IN_PROGRESS');
      const qr = await tx.execute<any>(
        sql`SELECT * FROM session_questions WHERE id=${input.sessionQuestionId} AND game_session_id=${s.id} FOR UPDATE`
      );
      const q = qr.rows[0];
      if (!q) throw new Error('GAME_SESSION_QUESTION_NOT_FOUND');
      if (q.status !== 'PENDING')
        throw new Error('GAME_SESSION_QUESTION_NOT_PENDING');
      if (new Date(q.presented_at).getTime() + 60000 < Date.now()) {
        await tx.execute(
          sql`UPDATE session_questions SET status='TIMED_OUT',answered_at=NOW() WHERE id=${q.id}`
        );
        return {
          finished: true,
          summary: await this.close(tx, s, 'TIMEOUT'),
          feedback: await this.answerFeedback(tx, q.question_id, s.language_code),
        };
      }
      const a = await tx.execute<any>(
        sql`SELECT ao.id, ao.is_correct, qt.explanation
          FROM answer_options ao
          INNER JOIN question_translations qt
            ON qt.question_id = ao.question_id AND qt.language_code = ${s.language_code}
          WHERE ao.id=${input.answerOptionId} AND ao.question_id=${q.question_id}`
      );
      if (!a.rows[0]) throw new Error('GAME_ANSWER_INVALID');
      const correct = !!a.rows[0].is_correct;
      const feedback = await this.answerFeedback(tx, q.question_id, s.language_code);
      await tx.execute(
        sql`UPDATE session_questions SET status='ANSWERED',selected_answer_option_id=${input.answerOptionId},is_correct=${correct},earned_points=${correct ? 1 : 0},answered_at=NOW() WHERE id=${q.id}`
      );
      if (!correct)
        return {
          finished: true,
          summary: await this.close(tx, s, 'WRONG_ANSWER'),
          feedback,
        };
      await tx.execute(
        sql`INSERT INTO score_events (id,user_id,game_session_id,session_question_id,points,event_type) VALUES (${createUuidV7()},${s.user_id},${s.id},${q.id},1,'CORRECT_ANSWER')`
      );
      const score = s.score + 1;
      if (score === 30) {
        await tx.execute(
          sql`UPDATE game_sessions SET score=${score} WHERE id=${s.id}`
        );
        return {
          finished: true,
          summary: await this.close(tx, { ...s, score }, 'COMPLETED'),
          feedback,
        };
      }
      const level = Math.floor(score / 10) + 1;
      await tx.execute(
        sql`UPDATE game_sessions SET score=${score},current_level=${level} WHERE id=${s.id}`
      );
      const o = await tx.execute<any>(
        sql`SELECT COALESCE(MAX(order_number),0)::int+1 n FROM session_questions WHERE game_session_id=${s.id}`
      );
      return {
        finished: false,
        feedback,
        session: {
          id: s.id,
          current_level: level,
          score,
          skips_remaining: s.skips_remaining,
          status: 'IN_PROGRESS',
        },
        question: await this.question(
          tx,
          s.id,
          s.language_code,
          level,
          Number(o.rows[0].n)
        ),
      };
    });
  }
  async finish(input: IFinishGameInput) {
    return this.db.transaction(async (tx) => {
      const r = await tx.execute<S>(
        sql`SELECT * FROM game_sessions WHERE id=${input.sessionId} AND user_id=${input.userId} FOR UPDATE`
      );
      const s = r.rows[0];
      if (!s) throw new Error('GAME_SESSION_NOT_FOUND');
      const c = await tx.execute<any>(
        sql`SELECT count(*) FILTER (WHERE is_correct=TRUE)::int correct,count(*) FILTER (WHERE status='ANSWERED')::int answered FROM session_questions WHERE game_session_id=${s.id}`
      );
      if (s.status === 'FINISHED') {
        const progress = await tx.execute(sql`
          SELECT highest_unlocked_level FROM player_progress WHERE user_id=${s.user_id}
        `);
        const timedOutQuestion = await tx.execute<{ question_id: string }>(sql`
          SELECT question_id FROM session_questions
          WHERE game_session_id=${s.id} AND status='TIMED_OUT'
          ORDER BY answered_at DESC NULLS LAST LIMIT 1
        `);
        if (!timedOutQuestion.rows[0]) throw new Error('GAME_SESSION_NOT_FINISHABLE');
        return {
          summary: summary(
            s,
            Number(c.rows[0].correct),
            Number(c.rows[0].answered),
            await this.jokers(tx, s.id),
            Number(progress.rows[0]?.highest_unlocked_level ?? 1)
          ),
          feedback: await this.answerFeedback(
            tx,
            timedOutQuestion.rows[0].question_id,
            s.language_code
          ),
        };
      }
      const p = await tx.execute<any>(
        sql`SELECT id,question_id,presented_at FROM session_questions WHERE game_session_id=${s.id} AND status='PENDING' FOR UPDATE`
      );
      if (
        !p.rows[0] ||
        new Date(p.rows[0].presented_at).getTime() + 60000 > Date.now()
      )
        throw new Error('GAME_SESSION_NOT_FINISHABLE');
      await tx.execute(
        sql`UPDATE session_questions SET status='TIMED_OUT',answered_at=NOW() WHERE id=${p.rows[0].id}`
      );
      return {
        summary: await this.close(tx, s, 'TIMEOUT'),
        feedback: await this.answerFeedback(tx, p.rows[0].question_id, s.language_code),
      };
    });
  }
  async abandon(input: { userId: string; sessionId: string }) {
    return this.db.transaction(async (tx) => {
      const result = await tx.execute<S>(sql`
        SELECT * FROM game_sessions
        WHERE id=${input.sessionId} AND user_id=${input.userId}
        FOR UPDATE
      `);
      const session = result.rows[0];
      if (!session) throw new Error('GAME_SESSION_NOT_FOUND');
      if (session.status !== 'IN_PROGRESS') return;
      await tx.execute(sql`
        UPDATE game_sessions
        SET status='ABANDONED', finished_at=NOW(), end_reason=NULL
        WHERE id=${session.id}
      `);
    });
  }
  async ranking(input: IRankingInput) {
    const off = (input.page - 1) * input.pageSize;
    const country = input.national
      ? sql`AND u.country_id=(SELECT country_id FROM users WHERE id=${input.userId})`
      : sql``;
    const rows = await this.db.execute<any>(
      sql`WITH best AS (SELECT DISTINCT ON (gs.user_id) gs.user_id,gs.score,gs.started_at,gs.finished_at, (SELECT count(*) FROM session_questions sq WHERE sq.game_session_id=gs.id AND sq.is_correct=TRUE)::int correct_answers FROM game_sessions gs WHERE gs.status='FINISHED' ORDER BY gs.user_id,gs.score DESC,gs.finished_at-gs.started_at ASC,gs.finished_at ASC), ranked AS (SELECT b.*,u.username,u.country_id,c.name country_name,row_number() OVER (ORDER BY b.score DESC,b.correct_answers DESC,b.finished_at-b.started_at ASC,b.finished_at ASC) position FROM best b JOIN users u ON u.id=b.user_id JOIN countries c ON c.id=u.country_id WHERE u.active=TRUE ${country}) SELECT *,count(*) OVER() total FROM ranked ORDER BY position LIMIT ${input.pageSize} OFFSET ${off}`
    );
    return {
      page: input.page,
      page_size: input.pageSize,
      total: Number(rows.rows[0]?.total ?? 0),
      items: rows.rows.map((x: any) => ({
        position: Number(x.position),
        user_id: x.user_id,
        username: x.username,
        country_id: x.country_id,
        country_name: x.country_name,
        score: x.score,
        correct_answers: x.correct_answers,
        duration_seconds: Math.floor(
          (new Date(x.finished_at).getTime() -
            new Date(x.started_at).getTime()) /
            1000
        ),
      })),
    };
  }
  async myRanking(userId: string) {
    const position = async (national: boolean) => {
      const country = national
        ? sql`AND u.country_id=(SELECT country_id FROM users WHERE id=${userId})`
        : sql``;
      const r = await this.db.execute<any>(
        sql`WITH best AS (SELECT DISTINCT ON (gs.user_id) gs.user_id,gs.score,gs.started_at,gs.finished_at,(SELECT count(*) FROM session_questions sq WHERE sq.game_session_id=gs.id AND sq.is_correct=TRUE)::int correct_answers FROM game_sessions gs WHERE gs.status='FINISHED' ORDER BY gs.user_id,gs.score DESC,gs.finished_at-gs.started_at ASC,gs.finished_at ASC), ranked AS (SELECT b.*,row_number() OVER (ORDER BY b.score DESC,b.correct_answers DESC,b.finished_at-b.started_at ASC,b.finished_at ASC) position FROM best b JOIN users u ON u.id=b.user_id WHERE u.active=TRUE ${country}) SELECT position,score,correct_answers,EXTRACT(EPOCH FROM finished_at-started_at)::int duration_seconds FROM ranked WHERE user_id=${userId}`
      );
      return r.rows[0] ?? null;
    };
    return {
      international: await position(false),
      national: await position(true),
    };
  }
}

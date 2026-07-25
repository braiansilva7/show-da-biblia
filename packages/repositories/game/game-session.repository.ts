import { inject, injectable } from 'tsyringe';
import { sql } from 'drizzle-orm';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';
import type { ISkipQuestionInput } from '@core/interfaces/game/ISkipQuestionInput.js';
import type {
  IInitializeSessionJokersInput,
  IUseSessionJokerInput,
  JokerTypeCode,
} from '@core/interfaces/game/IUseSessionJokerInput.js';

type Timestamp = string | Date;
type SessionRow = {
  id: string;
  language_code: 'pt-BR' | 'en' | 'es';
  current_level: number;
  score: number;
  skips_remaining: number;
  status: 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
};
type SessionQuestionRow = { id: string; difficulty_level: number };
type NextQuestionRow = { id: string; statement: string };
type AnswerRow = { id: string; position: number; content: string };
type JokerTypeRow = {
  id: number;
  code: JokerTypeCode;
  eliminated_wrong_answers: number;
  reveals_correct_answer: boolean;
};
type SessionJokerRow = {
  id: string;
  quantity_available: number;
  quantity_used: number;
};

export type UseSessionJokerResult = {
  session_joker: {
    joker_type_code: JokerTypeCode;
    quantity_available: number;
    quantity_used: number;
  };
  effect: {
    eliminated_answer_option_ids: string[];
    revealed_answer_option_id?: string;
  };
};

export type SkipQuestionResult = {
  session: {
    id: string;
    current_level: number;
    score: number;
    skips_remaining: number;
    status: 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
  };
  question: {
    session_question_id: string;
    order_number: number;
    difficulty_level: number;
    presented_at: string;
    statement: string;
    answers: AnswerRow[];
  };
};

function toIso(value: Timestamp): string {
  return value instanceof Date ? value.toISOString() : value;
}

@injectable()
export class GameSessionRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}

  async skipQuestion(input: ISkipQuestionInput): Promise<SkipQuestionResult> {
    return this.db.transaction(async (tx) => {
      const sessionResult = await tx.execute<SessionRow>(sql`
        SELECT id, language_code, current_level, score, skips_remaining, status
        FROM game_sessions
        WHERE id = ${input.sessionId}
          AND user_id = ${input.userId}
        FOR UPDATE
      `);
      const session = sessionResult.rows[0];
      if (!session) throw new Error('GAME_SESSION_NOT_FOUND');
      if (session.status !== 'IN_PROGRESS')
        throw new Error('GAME_SESSION_NOT_IN_PROGRESS');
      if (session.skips_remaining <= 0)
        throw new Error('GAME_SESSION_SKIPS_EXHAUSTED');

      const currentResult = await tx.execute<SessionQuestionRow>(sql`
        SELECT id, difficulty_level
        FROM session_questions
        WHERE id = ${input.sessionQuestionId}
          AND game_session_id = ${session.id}
        FOR UPDATE
      `);
      const current = currentResult.rows[0];
      if (!current || current.id !== input.sessionQuestionId)
        throw new Error('GAME_SESSION_QUESTION_NOT_FOUND');

      const pendingResult = await tx.execute<{ id: string }>(sql`
        SELECT id
        FROM session_questions
        WHERE id = ${current.id}
          AND status = 'PENDING'
      `);
      if (!pendingResult.rows[0])
        throw new Error('GAME_SESSION_QUESTION_NOT_PENDING');

      const nextQuestionResult = await tx.execute<NextQuestionRow>(sql`
        SELECT q.id, qt.statement
        FROM questions q
        INNER JOIN question_translations qt
          ON qt.question_id = q.id
         AND qt.language_code = ${session.language_code}
        WHERE q.status = 'PUBLISHED'
          AND q.difficulty_level = ${current.difficulty_level}
          AND NOT EXISTS (
            SELECT 1
            FROM session_questions used_questions
            WHERE used_questions.game_session_id = ${session.id}
              AND used_questions.question_id = q.id
          )
        ORDER BY q.published_at ASC NULLS LAST, q.id ASC
        LIMIT 1
      `);
      const nextQuestion = nextQuestionResult.rows[0];
      if (!nextQuestion) throw new Error('GAME_SESSION_NO_NEXT_QUESTION');

      const answersResult = await tx.execute<AnswerRow>(sql`
        SELECT ao.id, ao.position, aot.content
        FROM answer_options ao
        INNER JOIN answer_option_translations aot
          ON aot.answer_option_id = ao.id
         AND aot.language_code = ${session.language_code}
        WHERE ao.question_id = ${nextQuestion.id}
        ORDER BY ao.position ASC
      `);
      if (answersResult.rows.length !== 4)
        throw new Error('GAME_SESSION_NO_NEXT_QUESTION');

      const orderResult = await tx.execute<{ order_number: number }>(sql`
        SELECT COALESCE(MAX(order_number), 0)::int + 1 AS order_number
        FROM session_questions
        WHERE game_session_id = ${session.id}
      `);
      const orderNumber = Number(orderResult.rows[0]?.order_number ?? 1);
      const presentedAt = new Date();
      const nextSessionQuestionId = createUuidV7();

      await tx.execute(sql`
        UPDATE session_questions
        SET status = 'SKIPPED', skipped_at = ${presentedAt}
        WHERE id = ${current.id}
      `);
      await tx.execute(sql`
        UPDATE game_sessions
        SET skips_remaining = skips_remaining - 1
        WHERE id = ${session.id}
      `);
      await tx.execute(sql`
        INSERT INTO session_questions (
          id, game_session_id, question_id, difficulty_level, order_number,
          status, presented_at
        ) VALUES (
          ${nextSessionQuestionId}, ${session.id}, ${nextQuestion.id},
          ${current.difficulty_level}, ${orderNumber}, 'PENDING', ${presentedAt}
        )
      `);

      return {
        session: {
          id: session.id,
          current_level: session.current_level,
          score: session.score,
          skips_remaining: session.skips_remaining - 1,
          status: session.status,
        },
        question: {
          session_question_id: nextSessionQuestionId,
          order_number: orderNumber,
          difficulty_level: current.difficulty_level,
          presented_at: toIso(presentedAt),
          statement: nextQuestion.statement,
          answers: answersResult.rows,
        },
      };
    });
  }

  async initializeSessionJokers(input: IInitializeSessionJokersInput) {
    return this.db.transaction(async (tx) => {
      const session = await tx.execute<{ id: string }>(sql`
        SELECT id
        FROM game_sessions
        WHERE id = ${input.sessionId}
        FOR UPDATE
      `);
      if (!session.rows[0]) throw new Error('GAME_SESSION_NOT_FOUND');

      const eliminationType = await tx.execute<JokerTypeRow>(sql`
        SELECT id, code, eliminated_wrong_answers, reveals_correct_answer
        FROM joker_types
        WHERE active = TRUE
          AND code IN ('ELIMINATE_1', 'ELIMINATE_2', 'ELIMINATE_3')
        ORDER BY random()
        LIMIT 1
      `);
      const revealType = await tx.execute<JokerTypeRow>(sql`
        SELECT id, code, eliminated_wrong_answers, reveals_correct_answer
        FROM joker_types
        WHERE active = TRUE
          AND code = 'REVEAL_ANSWER'
        LIMIT 1
      `);
      if (!eliminationType.rows[0] || !revealType.rows[0])
        throw new Error('GAME_JOKER_TYPE_NOT_FOUND');

      await tx.execute(sql`
        INSERT INTO session_jokers (
          id, game_session_id, joker_type_id, quantity_available, quantity_used
        ) VALUES (
          ${createUuidV7()}, ${input.sessionId}, ${eliminationType.rows[0].id},
          ${input.eliminationQuantity}, 0
        )
        ON CONFLICT (game_session_id, joker_type_id) DO NOTHING
      `);
      await tx.execute(sql`
        INSERT INTO session_jokers (
          id, game_session_id, joker_type_id, quantity_available, quantity_used
        ) VALUES (
          ${createUuidV7()}, ${input.sessionId}, ${revealType.rows[0].id},
          ${input.revealQuantity}, 0
        )
        ON CONFLICT (game_session_id, joker_type_id) DO NOTHING
      `);
    });
  }

  async useSessionJoker(
    input: IUseSessionJokerInput
  ): Promise<UseSessionJokerResult> {
    return this.db.transaction(async (tx) => {
      const sessionResult = await tx.execute<SessionRow>(sql`
        SELECT id, language_code, current_level, score, skips_remaining, status
        FROM game_sessions
        WHERE id = ${input.sessionId}
          AND user_id = ${input.userId}
        FOR UPDATE
      `);
      const session = sessionResult.rows[0];
      if (!session) throw new Error('GAME_SESSION_NOT_FOUND');
      if (session.status !== 'IN_PROGRESS')
        throw new Error('GAME_SESSION_NOT_IN_PROGRESS');

      const questionResult = await tx.execute<{
        id: string;
        question_id: string;
      }>(sql`
        SELECT id, question_id
        FROM session_questions
        WHERE id = ${input.sessionQuestionId}
          AND game_session_id = ${session.id}
        FOR UPDATE
      `);
      const sessionQuestion = questionResult.rows[0];
      if (!sessionQuestion) throw new Error('GAME_SESSION_QUESTION_NOT_FOUND');

      const pendingResult = await tx.execute<{ id: string }>(sql`
        SELECT id
        FROM session_questions
        WHERE id = ${sessionQuestion.id}
          AND status = 'PENDING'
      `);
      if (!pendingResult.rows[0])
        throw new Error('GAME_SESSION_QUESTION_NOT_PENDING');

      const jokerTypeResult = await tx.execute<JokerTypeRow>(sql`
        SELECT id, code, eliminated_wrong_answers, reveals_correct_answer
        FROM joker_types
        WHERE code = ${input.jokerTypeCode}
          AND active = TRUE
      `);
      const jokerType = jokerTypeResult.rows[0];
      if (!jokerType) throw new Error('GAME_JOKER_TYPE_NOT_FOUND');

      const sessionJokerResult = await tx.execute<SessionJokerRow>(sql`
        SELECT id, quantity_available, quantity_used
        FROM session_jokers
        WHERE game_session_id = ${session.id}
          AND joker_type_id = ${jokerType.id}
        FOR UPDATE
      `);
      const sessionJoker = sessionJokerResult.rows[0];
      if (!sessionJoker || sessionJoker.quantity_available <= 0)
        throw new Error('GAME_JOKER_NOT_AVAILABLE');

      const usageExists = await tx.execute<{ id: string }>(sql`
        SELECT id
        FROM joker_usages
        WHERE session_question_id = ${sessionQuestion.id}
          AND joker_type_id = ${jokerType.id}
      `);
      if (usageExists.rows[0]) throw new Error('GAME_JOKER_ALREADY_USED');

      const usageId = createUuidV7();
      const eliminatedAnswerOptionIds: string[] = [];
      let revealedAnswerOptionId: string | undefined;

      if (jokerType.reveals_correct_answer) {
        const correctAnswer = await tx.execute<{ id: string }>(sql`
          SELECT id
          FROM answer_options
          WHERE question_id = ${sessionQuestion.question_id}
            AND is_correct = TRUE
          LIMIT 1
        `);
        revealedAnswerOptionId = correctAnswer.rows[0]?.id;
        if (!revealedAnswerOptionId) throw new Error('GAME_JOKER_TYPE_NOT_FOUND');
      } else {
        const incorrectAnswers = await tx.execute<{ id: string }>(sql`
          SELECT ao.id
          FROM answer_options ao
          WHERE ao.question_id = ${sessionQuestion.question_id}
            AND ao.is_correct = FALSE
            AND NOT EXISTS (
              SELECT 1
              FROM joker_eliminated_options jeo
              INNER JOIN joker_usages ju ON ju.id = jeo.joker_usage_id
              WHERE ju.session_question_id = ${sessionQuestion.id}
                AND jeo.answer_option_id = ao.id
            )
          ORDER BY random()
          LIMIT ${jokerType.eliminated_wrong_answers}
        `);
        if (incorrectAnswers.rows.length !== jokerType.eliminated_wrong_answers)
          throw new Error('GAME_JOKER_INSUFFICIENT_OPTIONS');
        eliminatedAnswerOptionIds.push(...incorrectAnswers.rows.map((row) => row.id));
      }

      await tx.execute(sql`
        INSERT INTO joker_usages (id, session_question_id, joker_type_id)
        VALUES (${usageId}, ${sessionQuestion.id}, ${jokerType.id})
      `);

      for (const answerOptionId of eliminatedAnswerOptionIds) {
        await tx.execute(sql`
          INSERT INTO joker_eliminated_options (id, joker_usage_id, answer_option_id)
          VALUES (${createUuidV7()}, ${usageId}, ${answerOptionId})
        `);
      }

      await tx.execute(sql`
        UPDATE session_jokers
        SET quantity_available = quantity_available - 1,
            quantity_used = quantity_used + 1
        WHERE id = ${sessionJoker.id}
      `);

      return {
        session_joker: {
          joker_type_code: jokerType.code,
          quantity_available: sessionJoker.quantity_available - 1,
          quantity_used: sessionJoker.quantity_used + 1,
        },
        effect: {
          eliminated_answer_option_ids: eliminatedAnswerOptionIds,
          ...(revealedAnswerOptionId
            ? { revealed_answer_option_id: revealedAnswerOptionId }
            : {}),
        },
      };
    });
  }
}

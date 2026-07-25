import { eq, sql } from 'drizzle-orm';
import { inject, injectable } from 'tsyringe';
import type {
  QuestionFilterCategory,
  QuestionListItem,
  QuestionStatus,
} from '@core/common/types/question.js';
import type { IListQuestionsInput } from '@core/interfaces/question/IListQuestionsInput.js';
import type { AppDatabase } from '@core/plugins/database/index.js';
import { questions, questionTranslations } from '@core/models/question/question.model.js';
import { answerOptions, answerOptionTranslations } from '@core/models/answer/answer.model.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';
import type { IQuestionMutationInput, QuestionLanguage } from '@core/interfaces/question/IQuestionMutationInput.js';
import type { DifficultyLevel } from '@core/common/types/difficulty.js';

type QuestionRow = Omit<
  QuestionListItem,
  'category' | 'author' | 'is_complete'
> & {
  category_id: string;
  category_name: string;
  author_id: string;
  author_username: string;
  author_email: string;
  difficulty_level: number;
  status: QuestionStatus;
  languages: string[] | null;
  created_at: string | Date;
  updated_at: string | Date;
  published_at: string | Date | null;
};

function toTimestamp(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

@injectable()
export class QuestionRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}

  async list(input: IListQuestionsInput): Promise<{
    questions: QuestionListItem[];
    total: number;
    categories: QuestionFilterCategory[];
  }> {
    const filters = [sql`TRUE`];
    if (input.search?.trim()) {
      const search = `%${input.search.trim()}%`;
      filters.push(sql`EXISTS (
        SELECT 1 FROM question_translations search_translations
        WHERE search_translations.question_id = q.id
          AND search_translations.statement ILIKE ${search}
      )`);
    }
    if (input.categoryId)
      filters.push(sql`q.category_id = ${input.categoryId}`);
    if (input.difficultyLevel)
      filters.push(sql`q.difficulty_level = ${input.difficultyLevel}`);
    if (input.status) filters.push(sql`q.status = ${input.status}`);
    if (input.author?.trim()) {
      const author = `%${input.author.trim()}%`;
      filters.push(
        sql`(u.username ILIKE ${author} OR u.email ILIKE ${author})`
      );
    }
    if (input.createdFrom)
      filters.push(sql`q.created_at >= ${input.createdFrom}::timestamptz`);
    if (input.createdTo)
      filters.push(sql`q.created_at <= ${input.createdTo}::timestamptz`);
    const where = sql.join(filters, sql` AND `);
    const offset = (input.page - 1) * input.limit;

    const [rowsResult, countResult, categoriesResult] = await Promise.all([
      this.db.execute<QuestionRow>(sql`
        SELECT
          q.id,
          preview.statement AS statement_preview,
          preview.language_code AS statement_language,
          c.id AS category_id,
          c.name AS category_name,
          q.difficulty_level,
          q.status,
          u.id AS author_id,
          u.username AS author_username,
          u.email AS author_email,
          q.created_at,
          q.updated_at,
          q.published_at,
          COALESCE(array_agg(DISTINCT qt.language_code) FILTER (WHERE qt.language_code IN ('pt-BR', 'en', 'es')), '{}') AS languages,
          count(DISTINCT ao.id)::int AS answer_options_count,
          count(DISTINCT ao.id) FILTER (WHERE ao.is_correct)::int AS correct_answers_count
        FROM questions q
        INNER JOIN categories c ON c.id = q.category_id
        INNER JOIN users u ON u.id = q.created_by_user_id
        LEFT JOIN LATERAL (
          SELECT statement, language_code
          FROM question_translations
          WHERE question_id = q.id
          ORDER BY CASE language_code WHEN ${input.language} THEN 0 ELSE 1 END, language_code
          LIMIT 1
        ) preview ON TRUE
        LEFT JOIN question_translations qt ON qt.question_id = q.id
        LEFT JOIN answer_options ao ON ao.question_id = q.id
        WHERE ${where}
        GROUP BY q.id, c.id, u.id, preview.statement, preview.language_code
        ORDER BY q.created_at DESC, q.id DESC
        LIMIT ${input.limit} OFFSET ${offset}
      `),
      this.db.execute<{ total: number }>(sql`
        SELECT count(*)::int AS total
        FROM questions q
        INNER JOIN users u ON u.id = q.created_by_user_id
        WHERE ${where}
      `),
      this.db.execute<QuestionFilterCategory & Record<string, unknown>>(sql`
        SELECT id, name FROM categories ORDER BY name
      `),
    ]);

    return {
      questions: rowsResult.rows.map((row) => {
        const languages = row.languages ?? [];
        const answerOptionsCount = Number(row.answer_options_count);
        const correctAnswersCount = Number(row.correct_answers_count);
        return {
          id: row.id,
          statement_preview: row.statement_preview,
          statement_language: row.statement_language,
          category: { id: row.category_id, name: row.category_name },
          difficulty_level:
            row.difficulty_level as QuestionListItem['difficulty_level'],
          status: row.status,
          languages,
          author: {
            id: row.author_id,
            username: row.author_username,
            email: row.author_email,
          },
          created_at: toTimestamp(row.created_at)!,
          updated_at: toTimestamp(row.updated_at)!,
          published_at: toTimestamp(row.published_at),
          answer_options_count: answerOptionsCount,
          correct_answers_count: correctAnswersCount,
          is_complete:
            ['pt-BR', 'en', 'es'].every((language) =>
              languages.includes(language)
            ) &&
            answerOptionsCount === 5 &&
            correctAnswersCount === 1,
        };
      }),
      total: Number(countResult.rows[0]?.total ?? 0),
      categories: categoriesResult.rows,
    };
  }

  async findForEdit(id: string) {
    const [question] = await this.db.select().from(questions).where(eq(questions.id, id)).limit(1);
    if (!question) return null;
    const translations = await this.db.select().from(questionTranslations).where(eq(questionTranslations.question_id, id));
    const options = await this.db.select().from(answerOptions).where(eq(answerOptions.question_id, id)).orderBy(answerOptions.position);
    const optionTranslations = options.length
      ? await this.db.execute<Record<string, unknown>>(sql`SELECT * FROM answer_option_translations WHERE answer_option_id IN (${sql.join(options.map((option) => sql`${option.id}`), sql`, `)})`)
      : { rows: [] as Record<string, unknown>[] };
    return { question, translations, options, optionTranslations: optionTranslations.rows };
  }

  async create(input: IQuestionMutationInput, userId: string) {
    const id = await this.db.transaction(async (tx) => {
      const id = createUuidV7();
      await tx.insert(questions).values({ id, category_id: input.categoryId, difficulty_level: input.difficultyLevel, created_by_user_id: userId, status: 'DRAFT' });
      await this.saveTranslations(tx, id, input);
      return id;
    });
    return this.findForEdit(id);
  }

  async update(id: string, input: IQuestionMutationInput) {
    await this.db.transaction(async (tx) => {
      await tx.update(questions).set({ category_id: input.categoryId, difficulty_level: input.difficultyLevel }).where(eq(questions.id, id));
      await this.saveTranslations(tx, id, input);
    });
    return this.findForEdit(id);
  }

  async publish(id: string) {
    await this.db.update(questions).set({ status: 'PUBLISHED', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).where(eq(questions.id, id));
    return this.findForEdit(id);
  }

  async unpublish(id: string) {
    await this.db.update(questions).set({ status: 'DRAFT', published_at: null, updated_at: new Date().toISOString() }).where(eq(questions.id, id));
    return this.findForEdit(id);
  }

  async remove(id: string): Promise<'deleted' | 'archived'> {
    const usage = await this.db.execute<{ total: number }>(sql`SELECT count(*)::int AS total FROM session_questions WHERE question_id = ${id}`);
    if (Number(usage.rows[0]?.total ?? 0) > 0) {
      await this.db.update(questions).set({ status: 'ARCHIVED', published_at: null, updated_at: new Date().toISOString() }).where(eq(questions.id, id));
      return 'archived';
    }
    await this.db.delete(questions).where(eq(questions.id, id));
    return 'deleted';
  }

  /** Shared game selector: drafts and archived questions are never eligible. */
  async listPublishedForGame(categoryId: string, difficultyLevel: DifficultyLevel) {
    return this.db.execute<{ id: string }>(sql`
      SELECT id FROM questions
      WHERE status = 'PUBLISHED'
        AND category_id = ${categoryId}
        AND difficulty_level = ${difficultyLevel}
      ORDER BY published_at ASC, id ASC
    `);
  }

  private async saveTranslations(tx: any, questionId: string, input: IQuestionMutationInput) {
    const languages: QuestionLanguage[] = ['pt-BR', 'en', 'es'];
    for (const language of languages) {
      const value = input.translations[language];
      if (value?.statement && value.explanation) {
        await tx.insert(questionTranslations).values({ id: createUuidV7(), question_id: questionId, language_code: language, statement: value.statement, explanation: value.explanation }).onConflictDoUpdate({ target: [questionTranslations.question_id, questionTranslations.language_code], set: { statement: value.statement, explanation: value.explanation } });
      } else await tx.delete(questionTranslations).where(sql`${questionTranslations.question_id} = ${questionId} AND ${questionTranslations.language_code} = ${language}`);
    }
    const existing = await tx.select().from(answerOptions).where(eq(answerOptions.question_id, questionId));
    await tx.update(answerOptions).set({ is_correct: false }).where(eq(answerOptions.question_id, questionId));
    const byPosition = new Map<number, { id: string }>((existing as { id: string; position: number }[]).map((option) => [option.position, option]));
    for (const option of input.options) {
      const current = byPosition.get(option.position);
      const optionId = current?.id ?? createUuidV7();
      if (current) await tx.update(answerOptions).set({ is_correct: option.is_correct }).where(eq(answerOptions.id, optionId));
      else await tx.insert(answerOptions).values({ id: optionId, question_id: questionId, position: option.position, is_correct: option.is_correct });
      for (const language of languages) {
        const content = option.translations[language]?.content;
        if (content) await tx.insert(answerOptionTranslations).values({ id: createUuidV7(), answer_option_id: optionId, language_code: language, content }).onConflictDoUpdate({ target: [answerOptionTranslations.answer_option_id, answerOptionTranslations.language_code], set: { content } });
        else await tx.delete(answerOptionTranslations).where(sql`${answerOptionTranslations.answer_option_id} = ${optionId} AND ${answerOptionTranslations.language_code} = ${language}`);
      }
    }
  }
}

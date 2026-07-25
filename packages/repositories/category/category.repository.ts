import { and, eq, ne, sql } from 'drizzle-orm';
import { inject, injectable } from 'tsyringe';
import type { Category } from '@core/common/types/category.js';
import { createUuidV7 } from '@core/common/functions/uuid.js';
import type { IListCategoriesInput } from '@core/interfaces/category/IListCategoriesInput.js';
import { categories } from '@core/models/category/category.model.js';
import { questions } from '@core/models/question/question.model.js';
import type { AppDatabase } from '@core/plugins/database/index.js';

@injectable()
export class CategoryRepository {
  constructor(@inject('DatabaseRw') private readonly db: AppDatabase) {}

  async list(input: IListCategoriesInput): Promise<{
    categories: Category[];
    total: number;
  }> {
    const search = input.search?.trim().toLowerCase();
    const where = search
      ? sql`lower(${categories.name}) like ${`%${search}%`}`
      : undefined;
    const rows = await this.db
      .select()
      .from(categories)
      .where(where)
      .orderBy(categories.name)
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    const [count] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(categories)
      .where(where);
    return { categories: rows, total: count?.total ?? 0 };
  }

  async findById(id: string): Promise<Category | null> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category ?? null;
  }

  async existsByName(name: string, excludingCategoryId?: string) {
    const nameCondition = sql`lower(${categories.name}) = ${name.toLowerCase()}`;
    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        excludingCategoryId
          ? and(nameCondition, ne(categories.id, excludingCategoryId))
          : nameCondition
      )
      .limit(1);
    return rows.length > 0;
  }

  async hasQuestions(categoryId: string) {
    const rows = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.category_id, categoryId))
      .limit(1);
    return rows.length > 0;
  }

  async create(input: {
    name: string;
    description?: string | null;
    active?: boolean;
  }): Promise<Category> {
    const [category] = await this.db
      .insert(categories)
      .values({
        id: createUuidV7(),
        name: input.name,
        description: input.description ?? null,
        active: input.active ?? true,
      })
      .returning();
    return category;
  }

  async update(id: string, input: Partial<Omit<Category, 'id'>>) {
    const [category] = await this.db
      .update(categories)
      .set(input)
      .where(eq(categories.id, id))
      .returning();
    return category ?? null;
  }

  async delete(id: string) {
    const deleted = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    return deleted.length === 1;
  }
}

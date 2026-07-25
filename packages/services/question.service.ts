import { inject, injectable } from 'tsyringe';
import type { IListQuestionsInput } from '@core/interfaces/question/IListQuestionsInput.js';
import { QuestionRepository } from '@core/repositories/question/question.repository.js';
import type { IQuestionMutationInput } from '@core/interfaces/question/IQuestionMutationInput.js';
import { CategoryRepository } from '@core/repositories/category/category.repository.js';
import { isDifficultyLevel } from '@core/common/functions/difficulty.js';
import type { QuestionLanguage } from '@core/interfaces/question/IQuestionMutationInput.js';

export class QuestionPublishValidationError extends Error {
  constructor(readonly pending: string[]) { super('QUESTION_PUBLISH_INCOMPLETE'); }
}

const languages: QuestionLanguage[] = ['pt-BR', 'en', 'es'];
const answerOptionPositions = [1, 2, 3, 4] as const;

@injectable()
export class QuestionService {
  constructor(
    @inject(QuestionRepository)
    private readonly repository: QuestionRepository,
    @inject(CategoryRepository) private readonly categories: CategoryRepository
  ) {}

  list(input: IListQuestionsInput) {
    return this.repository.list(input);
  }

  async create(input: IQuestionMutationInput, userId: string) {
    await this.validate(input);
    return this.repository.create(input, userId);
  }

  async update(id: string, input: IQuestionMutationInput) {
    const current = await this.repository.findForEdit(id);
    if (!current) return null;
    await this.validate(input);
    return this.repository.update(id, input);
  }

  findForEdit(id: string) { return this.repository.findForEdit(id); }

  async publish(id: string) {
    const current = await this.repository.findForEdit(id);
    if (!current) return null;
    if (current.question.status === 'PUBLISHED') throw new Error('QUESTION_ALREADY_PUBLISHED');
    const pending = await this.publishPending(current);
    if (pending.length) throw new QuestionPublishValidationError(pending);
    return this.repository.publish(id);
  }

  async unpublish(id: string) {
    const current = await this.repository.findForEdit(id);
    if (!current) return null;
    if (current.question.status !== 'PUBLISHED') throw new Error('QUESTION_NOT_PUBLISHED');
    return this.repository.unpublish(id);
  }

  async remove(id: string) {
    const current = await this.repository.findForEdit(id);
    if (!current) return null;
    return { action: await this.repository.remove(id) };
  }

  private async validate(input: IQuestionMutationInput) {
    if (!(await this.categories.findById(input.categoryId))) throw new Error('CATEGORY_NOT_FOUND');
    if (input.options.length !== answerOptionPositions.length || new Set(input.options.map((option) => option.position)).size !== answerOptionPositions.length || !answerOptionPositions.every((position) => input.options.some((option) => option.position === position)) || input.options.filter((option) => option.is_correct).length !== 1) throw new Error('QUESTION_INVALID_OPTIONS');
    for (const translation of Object.values(input.translations)) if ((translation?.statement && !translation.explanation) || (!translation?.statement && translation?.explanation)) throw new Error('QUESTION_INVALID_TRANSLATION');
  }

  private async publishPending(current: NonNullable<Awaited<ReturnType<QuestionRepository['findForEdit']>>>) {
    const pending: string[] = [];
    if (!(await this.categories.findById(current.question.category_id))) pending.push('category');
    if (!isDifficultyLevel(current.question.difficulty_level)) pending.push('difficulty');
    const translations = new Map(current.translations.map((translation) => [translation.language_code, translation]));
    if (!languages.every((language) => {
      const translation = translations.get(language);
      return translation?.statement.trim() && translation.explanation.trim();
    })) pending.push('question_translations');
    const positions = current.options.map((option) => option.position);
    if (current.options.length !== answerOptionPositions.length || new Set(positions).size !== answerOptionPositions.length || !answerOptionPositions.every((position) => positions.includes(position))) pending.push('answer_options');
    if (current.options.filter((option) => option.is_correct).length !== 1) pending.push('correct_answer');
    const optionIds = new Set(current.options.map((option) => option.id));
    const optionTranslations = current.optionTranslations as Array<{ answer_option_id: string; language_code: QuestionLanguage; content: string }>;
    const completeTexts = current.options.every((option) => languages.every((language) => {
      const translation = optionTranslations.find((item) => item.answer_option_id === option.id && item.language_code === language);
      return Boolean(translation?.content?.trim());
    }));
    if (!completeTexts || optionTranslations.filter((translation) => optionIds.has(translation.answer_option_id)).length !== answerOptionPositions.length * languages.length) pending.push('answer_translations');
    return pending;
  }
}

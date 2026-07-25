import { inject, injectable } from 'tsyringe';
import type { ICreateCategoryInput } from '@core/interfaces/category/ICreateCategoryInput.js';
import type { IListCategoriesInput } from '@core/interfaces/category/IListCategoriesInput.js';
import type { IUpdateCategoryInput } from '@core/interfaces/category/IUpdateCategoryInput.js';
import { CategoryRepository } from '@core/repositories/category/category.repository.js';

@injectable()
export class CategoryService {
  constructor(
    @inject(CategoryRepository)
    private readonly repository: CategoryRepository
  ) {}

  list(input: IListCategoriesInput) {
    return this.repository.list(input);
  }

  async create(input: ICreateCategoryInput) {
    if (await this.repository.existsByName(input.name))
      throw new Error('CATEGORY_NAME_ALREADY_EXISTS');
    return this.repository.create(input);
  }

  async update(id: string, input: IUpdateCategoryInput) {
    const category = await this.repository.findById(id);
    if (!category) return null;
    if (await this.repository.hasQuestions(id))
      throw new Error('CATEGORY_HAS_QUESTIONS');
    if (
      input.name !== undefined &&
      (await this.repository.existsByName(input.name, id))
    ) {
      throw new Error('CATEGORY_NAME_ALREADY_EXISTS');
    }
    return this.repository.update(id, input);
  }

  async delete(id: string) {
    const category = await this.repository.findById(id);
    if (!category) return false;
    if (await this.repository.hasQuestions(id))
      throw new Error('CATEGORY_HAS_QUESTIONS');
    return this.repository.delete(id);
  }

  existsById(id: string) {
    return this.repository.findById(id).then(Boolean);
  }
}

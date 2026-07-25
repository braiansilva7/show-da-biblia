import { inject, injectable } from 'tsyringe';
import type { ICreateCategoryInput } from '@core/interfaces/category/ICreateCategoryInput.js';
import { CategoryService } from '@core/services/category.service.js';

@injectable()
export class CategoryCreatorUseCase {
  constructor(@inject(CategoryService) private readonly service: CategoryService) {}
  execute(input: ICreateCategoryInput) {
    return this.service.create(input);
  }
}

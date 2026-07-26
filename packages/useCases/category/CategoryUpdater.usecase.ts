import { inject, injectable } from 'tsyringe';
import type { IUpdateCategoryInput } from '@core/interfaces/category/IUpdateCategoryInput.js';
import { CategoryService } from '@core/services/category.service.js';

@injectable()
export class CategoryUpdaterUseCase {
  constructor(
    @inject(CategoryService) private readonly service: CategoryService
  ) {}
  execute(id: string, input: IUpdateCategoryInput) {
    return this.service.update(id, input);
  }
}

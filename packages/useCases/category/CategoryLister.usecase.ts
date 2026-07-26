import { inject, injectable } from 'tsyringe';
import type { IListCategoriesInput } from '@core/interfaces/category/IListCategoriesInput.js';
import { CategoryService } from '@core/services/category.service.js';

@injectable()
export class CategoryListerUseCase {
  constructor(
    @inject(CategoryService) private readonly service: CategoryService
  ) {}
  execute(input: IListCategoriesInput) {
    return this.service.list(input);
  }
}

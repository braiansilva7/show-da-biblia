import { inject, injectable } from 'tsyringe';
import { CategoryService } from '@core/services/category.service.js';

@injectable()
export class CategoryDeleterUseCase {
  constructor(@inject(CategoryService) private readonly service: CategoryService) {}
  execute(id: string) {
    return this.service.delete(id);
  }
}

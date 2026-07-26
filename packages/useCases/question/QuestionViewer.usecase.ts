import { inject, injectable } from 'tsyringe';
import { QuestionService } from '@core/services/question.service.js';
@injectable()
export class QuestionViewerUseCase {
  constructor(
    @inject(QuestionService) private readonly service: QuestionService
  ) {}
  execute(id: string) {
    return this.service.findForEdit(id);
  }
}

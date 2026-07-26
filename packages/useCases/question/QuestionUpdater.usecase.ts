import { inject, injectable } from 'tsyringe';
import type { IQuestionMutationInput } from '@core/interfaces/question/IQuestionMutationInput.js';
import { QuestionService } from '@core/services/question.service.js';
@injectable()
export class QuestionUpdaterUseCase {
  constructor(
    @inject(QuestionService) private readonly service: QuestionService
  ) {}
  execute(id: string, input: IQuestionMutationInput) {
    return this.service.update(id, input);
  }
}

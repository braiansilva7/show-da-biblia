import { inject, injectable } from 'tsyringe';
import type { IQuestionMutationInput } from '@core/interfaces/question/IQuestionMutationInput.js';
import { QuestionService } from '@core/services/question.service.js';
@injectable()
export class QuestionCreatorUseCase {
  constructor(
    @inject(QuestionService) private readonly service: QuestionService
  ) {}
  execute(input: IQuestionMutationInput, userId: string) {
    return this.service.create(input, userId);
  }
}

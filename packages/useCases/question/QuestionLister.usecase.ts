import { inject, injectable } from 'tsyringe';
import type { IListQuestionsInput } from '@core/interfaces/question/IListQuestionsInput.js';
import { QuestionService } from '@core/services/question.service.js';

@injectable()
export class QuestionListerUseCase {
  constructor(
    @inject(QuestionService) private readonly service: QuestionService
  ) {}
  execute(input: IListQuestionsInput) {
    return this.service.list(input);
  }
}

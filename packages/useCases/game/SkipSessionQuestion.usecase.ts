import { inject, injectable } from 'tsyringe';
import type { ISkipQuestionInput } from '@core/interfaces/game/ISkipQuestionInput.js';
import { GameService } from '@core/services/game.service.js';

@injectable()
export class SkipSessionQuestionUseCase {
  constructor(@inject(GameService) private readonly service: GameService) {}

  execute(input: ISkipQuestionInput) {
    return this.service.skipQuestion(input);
  }
}

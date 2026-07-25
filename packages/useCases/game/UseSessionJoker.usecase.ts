import { inject, injectable } from 'tsyringe';
import type { IUseSessionJokerInput } from '@core/interfaces/game/IUseSessionJokerInput.js';
import { GameService } from '@core/services/game.service.js';

@injectable()
export class UseSessionJokerUseCase {
  constructor(@inject(GameService) private readonly service: GameService) {}

  execute(input: IUseSessionJokerInput) {
    return this.service.useSessionJoker(input);
  }
}

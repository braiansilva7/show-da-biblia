import { inject, injectable } from 'tsyringe';
import { managerApiEnvironment } from '@core/config/environments.js';
import { GameService } from '@core/services/game.service.js';

@injectable()
export class InitializeSessionJokersUseCase {
  constructor(@inject(GameService) private readonly service: GameService) {}

  execute(sessionId: string) {
    const config = managerApiEnvironment();
    return this.service.initializeSessionJokers({
      sessionId,
      eliminationQuantity: config.jokerEliminationQuantity,
      revealQuantity: config.jokerRevealQuantity,
    });
  }
}

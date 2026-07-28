import { inject, injectable } from 'tsyringe';
import { managerApiEnvironment } from '@core/config/environments.js';
import { GameplayRepository } from '@core/repositories/game/gameplay.repository.js';
@injectable()
export class GameplayUseCase {
  constructor(
    @inject(GameplayRepository) private readonly repo: GameplayRepository
  ) {}
  start(userId: string) {
    const c = managerApiEnvironment();
    return this.repo.start({
      userId,
      eliminationQuantity: c.jokerEliminationQuantity,
      revealQuantity: c.jokerRevealQuantity,
    });
  }
  answer(input: any) {
    return this.repo.answer(input);
  }
  finish(input: any) {
    return this.repo.finish(input);
  }
  abandon(input: any) {
    return this.repo.abandon(input);
  }
  ranking(input: any) {
    return this.repo.ranking(input);
  }
  myRanking(userId: string) {
    return this.repo.myRanking(userId);
  }
}

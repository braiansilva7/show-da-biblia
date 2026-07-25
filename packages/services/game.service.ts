import { inject, injectable } from 'tsyringe';
import type { ISkipQuestionInput } from '@core/interfaces/game/ISkipQuestionInput.js';
import type {
  IInitializeSessionJokersInput,
  IUseSessionJokerInput,
} from '@core/interfaces/game/IUseSessionJokerInput.js';
import {
  GameSessionRepository,
  type SkipQuestionResult,
} from '@core/repositories/game/game-session.repository.js';

@injectable()
export class GameService {
  constructor(
    @inject(GameSessionRepository)
    private readonly sessions: GameSessionRepository
  ) {}

  skipQuestion(input: ISkipQuestionInput): Promise<SkipQuestionResult> {
    return this.sessions.skipQuestion(input);
  }

  initializeSessionJokers(input: IInitializeSessionJokersInput) {
    return this.sessions.initializeSessionJokers(input);
  }

  useSessionJoker(input: IUseSessionJokerInput) {
    return this.sessions.useSessionJoker(input);
  }
}

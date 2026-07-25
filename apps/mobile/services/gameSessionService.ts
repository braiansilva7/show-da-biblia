import type { GameSession } from '../types/game';

export interface GameSessionService {
  start(): Promise<GameSession>;
}

/** The API-backed implementation belongs to the gameplay integration milestone. */
export const gameSessionService: GameSessionService = {
  async start() {
    throw new Error('Gameplay is not available in the mobile foundation.');
  },
};

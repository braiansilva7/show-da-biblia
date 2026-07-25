export type Locale = 'pt-BR' | 'en' | 'es';

export type Player = {
  id: string;
  username: string;
  totalScore: number;
  locale: Locale;
  profilePictureUrl: string | null;
};

export type JokerCode =
  'ELIMINATE_1' | 'ELIMINATE_2' | 'ELIMINATE_3' | 'REVEAL_ANSWER';

export type Joker = {
  code: JokerCode;
  quantityAvailable: number;
};

export type GameAnswer = { id: string; position: number; content: string };

export type GameQuestion = {
  sessionQuestionId: string;
  orderNumber: number;
  difficultyLevel: 1 | 2 | 3;
  statement: string;
  answers: GameAnswer[];
};

export type GameSession = {
  id: string;
  status: 'IN_PROGRESS' | 'FINISHED';
  score: number;
  skipsRemaining: number;
  currentLevel: 1 | 2 | 3;
};

export type RankingEntry = {
  position: number;
  player: Pick<Player, 'id' | 'username' | 'profilePictureUrl'>;
  score: number;
  correctAnswers: number;
};

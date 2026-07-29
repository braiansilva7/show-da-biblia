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
  presentedAt: string;
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

export type GameStart = {
  session: GameSession;
  question: GameQuestion;
  jokers: Joker[];
};

export type GameSummary = {
  id: string;
  status: 'FINISHED';
  endReason: 'TIMEOUT' | 'WRONG_ANSWER' | 'COMPLETED';
  score: number;
  correctAnswers: number;
  answeredQuestions: number;
  skipsUsed: number;
  jokers: Array<Pick<Joker, 'code'> & { quantityUsed: number }>;
  highestUnlockedLevel: 1 | 2 | 3;
  durationSeconds: number | null;
};

export type AnswerFeedback = {
  correctAnswerOptionId: string;
  explanation: string;
};

export type TimeoutResult = { summary: GameSummary; feedback: AnswerFeedback };

export type AnswerResult =
  | { finished: true; summary: GameSummary; feedback: AnswerFeedback }
  | {
      finished: false;
      session: GameSession;
      question: GameQuestion;
      feedback: AnswerFeedback;
    };

export type JokerEffect = {
  joker: Joker;
  eliminatedOptionIds: string[];
  revealedOptionId?: string;
};

export type RankingEntry = {
  position: number;
  userId: string;
  username: string;
  countryId: string;
  countryName: string;
  profilePictureUrl: string | null;
  score: number;
  correctAnswers: number;
  durationSeconds: number;
};

export type RankingPage = {
  page: number;
  pageSize: number;
  total: number;
  items: RankingEntry[];
};

export type PlayerRanking = Pick<
  RankingEntry,
  'position' | 'score' | 'correctAnswers' | 'durationSeconds'
>;

export type MyRankings = {
  international: PlayerRanking | null;
  national: PlayerRanking | null;
};

export type RankingScope = 'international' | 'national';

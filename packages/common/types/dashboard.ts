export type DashboardSummary = {
  activeUsers: number;
  publishedQuestions: number;
  questionsByDifficulty: { easy: number; medium: number; hard: number };
  finishedGames: number;
  totalScore: number;
};

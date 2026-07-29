export type RankingScope = 'international' | 'national';

export interface ApiRankingEntry {
  position: number;
  user_id: string;
  username: string;
  country_id: string;
  country_name: string;
  profile_picture_url: string | null;
  score: number;
  correct_answers: number;
  duration_seconds: number;
}

export interface ApiRankingPage {
  page: number;
  page_size: number;
  total: number;
  items: ApiRankingEntry[];
}

export interface ApiPlayerRanking {
  position: number;
  score: number;
  correct_answers: number;
  duration_seconds: number;
}

export interface RankingEntry {
  position: number;
  userId: string;
  username: string;
  countryId: string;
  countryName: string;
  profilePictureUrl: string | null;
  score: number;
  correctAnswers: number;
  durationSeconds: number;
}

export interface RankingPage {
  page: number;
  pageSize: number;
  total: number;
  items: RankingEntry[];
}

export interface PlayerRanking {
  position: number;
  score: number;
  correctAnswers: number;
  durationSeconds: number;
}

export interface MyRankings {
  international: PlayerRanking | null;
  national: PlayerRanking | null;
}

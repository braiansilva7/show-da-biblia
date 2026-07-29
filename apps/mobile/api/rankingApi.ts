import { request } from './client';
import type {
  MyRankings,
  PlayerRanking,
  RankingEntry,
  RankingPage,
  RankingScope,
} from '../types/game';

type ApiRankingEntry = {
  position: number;
  user_id: string;
  username: string;
  country_id: string;
  country_name: string;
  profile_picture_url: string | null;
  score: number;
  correct_answers: number;
  duration_seconds: number;
};
type ApiRankingPage = {
  page: number;
  page_size: number;
  total: number;
  items: ApiRankingEntry[];
};
type ApiPlayerRanking = {
  position: number;
  score: number;
  correct_answers: number;
  duration_seconds: number;
};

function entry(value: ApiRankingEntry): RankingEntry {
  return {
    position: value.position,
    userId: value.user_id,
    username: value.username,
    countryId: value.country_id,
    countryName: value.country_name,
    profilePictureUrl: value.profile_picture_url,
    score: value.score,
    correctAnswers: value.correct_answers,
    durationSeconds: value.duration_seconds,
  };
}

function playerRanking(value: ApiPlayerRanking): PlayerRanking {
  return {
    position: value.position,
    score: value.score,
    correctAnswers: value.correct_answers,
    durationSeconds: value.duration_seconds,
  };
}

export const rankingApi = {
  async list(
    scope: RankingScope,
    page = 1,
    pageSize = 20
  ): Promise<RankingPage> {
    const response = await request<ApiRankingPage>(
      `/rankings/${scope}?page=${page}&page_size=${pageSize}`
    );
    return {
      page: response.page,
      pageSize: response.page_size,
      total: response.total,
      items: response.items.map(entry),
    };
  },
  async mine(): Promise<MyRankings> {
    const response = await request<{
      international: ApiPlayerRanking | null;
      national: ApiPlayerRanking | null;
    }>('/rankings/me');
    return {
      international: response.international
        ? playerRanking(response.international)
        : null,
      national: response.national ? playerRanking(response.national) : null,
    };
  },
};

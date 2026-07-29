import { rankingApi } from '../api/rankingApi';
import type { MyRankings, RankingPage, RankingScope } from '../types/game';

export interface RankingService {
  list(
    scope: RankingScope,
    page?: number,
    pageSize?: number
  ): Promise<RankingPage>;
  mine(): Promise<MyRankings>;
}

export const rankingService: RankingService = {
  list: (scope, page, pageSize) => rankingApi.list(scope, page, pageSize),
  mine: () => rankingApi.mine(),
};

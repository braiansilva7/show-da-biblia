import type { NavigatorScreenParams } from '@react-navigation/native';
import type { GameSummary } from '../types/game';

export type AppTabParamList = {
  Home: undefined;
  Rankings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: { resetSuccess?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  AppTabs: NavigatorScreenParams<AppTabParamList>;
  Game: undefined;
  Result: { summary: GameSummary };
};

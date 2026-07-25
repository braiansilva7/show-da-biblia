import type { NavigatorScreenParams } from '@react-navigation/native';

export type AppTabParamList = {
  Home: undefined;
  Rankings: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Access: undefined;
  AppTabs: NavigatorScreenParams<AppTabParamList>;
  Game: undefined;
  Result: { sessionId?: string };
};

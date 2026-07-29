import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useLocalization } from '../context/LocalizationContext';
import { AboutScreen } from '../screens/AboutScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RankingsScreen } from '../screens/RankingsScreen';
import { theme } from '../theme';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  const { t } = useLocalization();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Rankings"
        component={RankingsScreen}
        options={{
          title: t('tabRankings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: t('tabAbout'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="information-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

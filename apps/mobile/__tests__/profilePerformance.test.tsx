import { render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ProfileScreen } from '../screens/ProfileScreen';
import { countryApi } from '../api/countryApi';
import { rankingService } from '../services/rankingService';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => undefined,
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../components/AvatarCropper', () => ({ AvatarCropper: () => null }));
jest.mock('../components/FormField', () => ({ FormField: () => null }));
jest.mock('../components/PrimaryButton', () => ({ PrimaryButton: () => null }));
jest.mock('../components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@react-native-picker/picker', () => {
  const Picker = ({ children }: { children: ReactNode }) => children;
  Picker.Item = () => null;
  return { Picker };
});
jest.mock('../context/AppSessionContext', () => ({
  useAppSession: () => ({
    user: {
      id: 'me',
      username: 'Maria',
      email: 'maria@test.dev',
      countryId: 'br',
      languageCode: 'pt-BR',
      profilePictureUrl: null,
      totalScore: 30,
      bestTimeSeconds: 90,
    },
    updateProfile: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));
jest.mock('../api/countryApi', () => ({ countryApi: { list: jest.fn() } }));
jest.mock('../services/rankingService', () => ({
  rankingService: { mine: jest.fn() },
}));

describe('ProfileScreen performance summary', () => {
  it('shows the authenticated player positions returned by the API', async () => {
    (countryApi.list as jest.Mock).mockResolvedValue([]);
    (rankingService.mine as jest.Mock).mockResolvedValue({
      international: {
        position: 12,
        score: 30,
        correctAnswers: 30,
        durationSeconds: 90,
      },
      national: {
        position: 2,
        score: 30,
        correctAnswers: 30,
        durationSeconds: 90,
      },
    });

    const screen = render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('#12 · 01:30')).toBeTruthy();
      expect(screen.queryByText('countriesLoading')).toBeNull();
    });
    expect(screen.getByText('#2 · 01:30')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('01:30')).toBeTruthy();
  });
});

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { countryApi } from '../api/countryApi';
import { rankingService } from '../services/rankingService';
import { ProfileScreen } from '../screens/ProfileScreen';

const mockUpdateProfile = jest.fn();
const mockEnableBiometricLogin = jest.fn();
const mockDisableBiometricLogin = jest.fn();
const mockUseFocusEffect = jest.fn();
let mockFocusCleanup: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../components/AvatarCropper', () => ({ AvatarCropper: () => null }));
jest.mock('../components/FormField', () => {
  const { TextInput } = require('react-native');
  return {
    FormField: ({ label, ...props }: { label: string }) => (
      <TextInput accessibilityLabel={label} {...props} />
    ),
  };
});
jest.mock('../components/PrimaryButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PrimaryButton: ({ label, ...props }: { label: string }) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        {...props}
      >
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('../components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@react-native-picker/picker', () => {
  const { View } = require('react-native');
  const Picker = ({ selectedValue, ...props }: { selectedValue: string }) => (
    <View testID={`picker-${selectedValue}`} {...props} />
  );
  Picker.Item = () => null;
  return { Picker };
});
jest.mock('../context/AppSessionContext', () => ({
  useAppSession: () => ({
    biometricLoginEnabled: false,
    biometricLoginSupported: true,
    disableBiometricLogin: mockDisableBiometricLogin,
    enableBiometricLogin: mockEnableBiometricLogin,
    user: {
      id: 'me',
      username: 'Maria',
      email: 'maria@test.dev',
      countryId: 'br',
      languageCode: 'pt-BR',
      profilePictureUrl: 'https://cdn.test.dev/maria.jpg',
      totalScore: 30,
      bestTimeSeconds: 90,
    },
    updateProfile: mockUpdateProfile,
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

describe('ProfileScreen editing mode', () => {
  beforeEach(() => {
    mockUseFocusEffect.mockImplementation((effect: () => () => void) => {
      mockFocusCleanup = effect();
    });
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
    mockEnableBiometricLogin.mockReset();
    mockEnableBiometricLogin.mockResolvedValue('success');
    mockDisableBiometricLogin.mockReset();
    mockDisableBiometricLogin.mockResolvedValue(undefined);
    (countryApi.list as jest.Mock).mockResolvedValue([
      { id: 'br', name: 'Brasil' },
    ]);
    (rankingService.mine as jest.Mock).mockResolvedValue({
      international: null,
      national: null,
    });
  });

  it('keeps profile controls locked until editing is requested', async () => {
    const screen = render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('picker-br')).toBeTruthy();
      expect(screen.getAllByText('rankingNoPosition')).toHaveLength(2);
    });

    expect(screen.getByLabelText('username').props.editable).toBe(false);
    expect(screen.getByLabelText('email').props.editable).toBe(false);
    expect(screen.getByTestId('picker-pt-BR').props.enabled).toBe(false);
    expect(screen.getByTestId('picker-br').props.enabled).toBe(false);
    expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(
      true
    );
    expect(screen.queryByLabelText('choosePhoto')).toBeNull();
    expect(screen.queryByLabelText('saveProfile')).toBeNull();
    expect(screen.getByLabelText('editProfile')).toBeTruthy();
  });

  it('enables controls while editing and locks them after saving', async () => {
    const screen = render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('picker-br')).toBeTruthy();
      expect(screen.getAllByText('rankingNoPosition')).toHaveLength(2);
    });
    fireEvent.press(screen.getByLabelText('editProfile'));

    expect(screen.getByLabelText('username').props.editable).toBe(true);
    expect(screen.getByLabelText('email').props.editable).toBe(true);
    expect(screen.getByTestId('picker-pt-BR').props.enabled).toBe(true);
    expect(screen.getByTestId('picker-br').props.enabled).toBe(true);
    expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(
      false
    );
    expect(screen.getByLabelText('choosePhoto')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('saveProfile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('username').props.editable).toBe(false);
    expect(screen.queryByLabelText('saveProfile')).toBeNull();
    expect(screen.getByLabelText('editProfile')).toBeTruthy();
  });

  it('locks the profile again after the tab loses focus', async () => {
    const screen = render(<ProfileScreen />);

    await waitFor(() => expect(screen.getByTestId('picker-br')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('editProfile'));
    expect(screen.getByLabelText('username').props.editable).toBe(true);

    act(() => mockFocusCleanup?.());

    expect(screen.getByLabelText('username').props.editable).toBe(false);
    expect(screen.queryByLabelText('saveProfile')).toBeNull();
    expect(screen.getByLabelText('editProfile')).toBeTruthy();
  });

  it('allows the player to activate biometric login from the profile', async () => {
    const screen = render(<ProfileScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('biometricLoginTitle')).toBeTruthy()
    );
    fireEvent(
      screen.getByLabelText('biometricLoginTitle'),
      'valueChange',
      true
    );

    await waitFor(() =>
      expect(mockEnableBiometricLogin).toHaveBeenCalledWith('biometricPrompt')
    );
    expect(screen.getByText('biometricLoginEnabled')).toBeTruthy();
  });
});

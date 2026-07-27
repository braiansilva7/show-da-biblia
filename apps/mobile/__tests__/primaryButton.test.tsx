import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PrimaryButton, primaryButtonStyle } from '../components/PrimaryButton';

describe('PrimaryButton', () => {
  it('exposes a pressed visual state and invokes its action', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton label="Continue" onPress={onPress} />);
    expect(StyleSheet.flatten(primaryButtonStyle(true, false))).toMatchObject({
      opacity: 0.86,
      transform: [{ scale: 0.98 }],
    });
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke its action when disabled', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton label="Continue" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

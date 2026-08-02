import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export const appIcons = {
  book: 'book-open-page-variant',
  bookOutline: 'book-open-page-variant-outline',
  play: 'play',
  fingerprint: 'fingerprint',
  image: 'image-outline',
  edit: 'pencil-outline',
  logout: 'logout',
  star: 'star-four-points',
  timer: 'timer-outline',
  flag: 'flag-outline',
  globe: 'earth',
  mail: 'email-outline',
  heart: 'heart',
} as const satisfies Record<string, keyof typeof MaterialCommunityIcons.glyphMap>;

export type AppIconName = keyof typeof appIcons;

export function AppIcon({
  name,
  color = theme.colors.primary,
  size = 22,
}: {
  name: AppIconName;
  color?: string;
  size?: number;
}) {
  return <MaterialCommunityIcons color={color} name={appIcons[name]} size={size} />;
}

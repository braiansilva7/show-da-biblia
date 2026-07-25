import { colors } from './colors';

export const theme = {
  colors,
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 20 },
} as const;

export { colors };

import { colors } from './colors';

export const theme = {
  colors,
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 },
  radius: { sm: 10, md: 16, lg: 24, pill: 999 },
  typography: {
    overline: { fontSize: 12, fontWeight: '800' as const, letterSpacing: 1.1 },
    label: { fontSize: 14, fontWeight: '700' as const },
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 13, lineHeight: 19 },
    title: { fontSize: 30, fontWeight: '800' as const, lineHeight: 36 },
    heading: { fontSize: 22, fontWeight: '800' as const, lineHeight: 28 },
  },
  shadow: {
    card: {
      elevation: 3,
      shadowColor: '#342112',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    floating: {
      elevation: 8,
      shadowColor: '#342112',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
    },
  },
  layout: { contentMaxWidth: 640, touchTarget: 48 },
} as const;

export { colors };

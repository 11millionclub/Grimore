import type { TextStyle } from 'react-native';

/** 4-point spacing scale. Screens use 20 as edge padding. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

/** Cards 20, tiles/inputs 14, buttons and chips are full pills, covers 4 (they are physical objects). */
export const radius = {
  cover: 4,
  sm: 8,
  tile: 14,
  card: 20,
  sheet: 28,
  full: 999,
} as const;

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 36, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, letterSpacing: -0.95 },
  h2: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.34 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  mono: { fontFamily: fonts.monoBold, fontSize: 14, lineHeight: 18, fontVariant: ['tabular-nums'] },
  num: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, letterSpacing: -0.9, fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;

export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  spring: { damping: 20, stiffness: 260, mass: 0.9 },
  sheet: { damping: 26, stiffness: 260, mass: 1 },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 640,
  navBarHeight: 52,
  tabBarHeight: 62,
  coverAspect: 1.5,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

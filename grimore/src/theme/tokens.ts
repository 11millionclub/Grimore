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

/** Soft corners: cards 20, tiles 14, small controls 10; buttons and chips are pills. */
export const radius = {
  cover: 4,
  sm: 10,
  tile: 14,
  card: 20,
  sheet: 24,
  full: 999,
} as const;

/**
 * Geist for the interface, Cormorant Garamond for page titles, book titles and
 * quotes: a clean reading app with a storybook voice where it counts.
 */
export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  display: 'CormorantGaramond_700Bold',
  displayMedium: 'Geist_600SemiBold',
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.3 },
  h1: { fontFamily: fonts.display, fontSize: 29, lineHeight: 33, letterSpacing: -0.2 },
  h2: { fontFamily: fonts.serifBold, fontSize: 21, lineHeight: 25 },
  title: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  mono: { fontFamily: fonts.monoBold, fontSize: 14, lineHeight: 18, fontVariant: ['tabular-nums'] },
  num: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, fontVariant: ['lining-nums', 'tabular-nums'] },
  quote: { fontFamily: fonts.serifItalic, fontSize: 20, lineHeight: 27 },
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
  tabBarHeight: 64,
  coverAspect: 1.5,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

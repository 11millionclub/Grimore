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

/** Manuscript corners: cards and tiles are only slightly softened; chips stay pills. */
export const radius = {
  cover: 3,
  sm: 6,
  tile: 8,
  card: 10,
  sheet: 18,
  full: 999,
} as const;

/**
 * Cinzel (Roman inscription capitals) for headings and numerals, Cormorant
 * Garamond for book titles and quotes, Inter for everything you read at size.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Cinzel_700Bold',
  display: 'Cinzel_700Bold',
  displayMedium: 'Cinzel_600SemiBold',
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  mono: 'Inter_600SemiBold',
  monoBold: 'Inter_600SemiBold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: 0.4 },
  h1: { fontFamily: fonts.display, fontSize: 25, lineHeight: 31, letterSpacing: 0.3 },
  h2: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, letterSpacing: 0.6 },
  title: { fontFamily: fonts.serifBold, fontSize: 19, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  mono: { fontFamily: fonts.monoBold, fontSize: 14, lineHeight: 18, fontVariant: ['tabular-nums'] },
  num: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, fontVariant: ['lining-nums', 'tabular-nums'] },
  quote: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 26 },
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

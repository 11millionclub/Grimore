import type { TextStyle } from 'react-native';

/** 4-point spacing scale. Screens use `spacing.lg` (20) as edge padding. */
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

export const radius = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 12,
  xl: 18,
  full: 999,
} as const;

/**
 * Three families, each with one job:
 *  - Cinzel: inscriptions. Wordmark, mastheads, small-caps labels. Used sparingly.
 *  - Cormorant Garamond: the book itself. Headings, titles, quotes.
 *  - Inter: the interface. Controls, metadata, long UI text.
 */
export const fonts = {
  display: 'Cinzel_600SemiBold',
  displayBold: 'Cinzel_700Bold',
  inscription: 'Cinzel_500Medium',
  serif: 'CormorantGaramond_600SemiBold',
  serifMedium: 'CormorantGaramond_500Medium',
  serifBold: 'CormorantGaramond_700Bold',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  /** Kept for components that ask for the old names. */
  serifSemibold: 'CormorantGaramond_700Bold',
  serifRegular: 'CormorantGaramond_500Medium',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, letterSpacing: 1.2 },
  title1: { fontFamily: fonts.serifBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.3 },
  title2: { fontFamily: fonts.serifBold, fontSize: 27, lineHeight: 32, letterSpacing: -0.2 },
  title3: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 27 },
  bookTitle: { fontFamily: fonts.serifBold, fontSize: 18, lineHeight: 21 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 21, lineHeight: 29 },
  serifBody: { fontFamily: fonts.serifMedium, fontSize: 19, lineHeight: 27 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.inscription, fontSize: 11, lineHeight: 15, letterSpacing: 2.2, textTransform: 'uppercase' },
  button: { fontFamily: fonts.sansSemibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
  numeral: { fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 34 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;

export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 720,
  tabBarHeight: 66,
  coverAspect: 1.5,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

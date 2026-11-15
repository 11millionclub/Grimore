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
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

/**
 * Two families only:
 *  - Newsreader (editorial serif) for headings, book titles and quotes.
 *  - Inter (neutral sans) for interface, controls and metadata.
 */
export const fonts = {
  serif: 'Newsreader_500Medium',
  serifRegular: 'Newsreader_400Regular',
  serifSemibold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.serifSemibold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  title1: { fontFamily: fonts.serifSemibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title2: { fontFamily: fonts.serifSemibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  title3: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  bookTitle: { fontFamily: fonts.serifSemibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 28 },
  serifBody: { fontFamily: fonts.serifRegular, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.sansSemibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  button: { fontFamily: fonts.sansSemibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
  numeral: { fontFamily: fonts.serifSemibold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
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
  tabBarHeight: 64,
  coverAspect: 1.5,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

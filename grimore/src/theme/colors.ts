/**
 * Grimore colour tokens.
 *
 * Clean warm-white paper, near-black ink, one midnight-blue accent for
 * actions and gilt for stars and the few ornaments. "dark" is the same idea by lamplight, used for
 * the camera, which needs a dark surround. No hex values live outside this
 * file, except the decorative Corner themes and Wrapped story fields.
 */

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineStrong: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  gold: string;
  goldSoft: string;
  good: string;
  goodSoft: string;
  danger: string;
  glass: string;
  glassEdge: string;
  scrim: string;
  shadow: string;
};

/**
 * The fantasy-library palette: deep black #100D0B, dark walnut #25170F,
 * antique gold #C69A43, champagne #E8D19B, warm ivory #F2E9D8, dusty rose
 * #B77B83, deep burgundy #54202A and forest green #263C30.
 */
export const GILT = {
  black: '#100D0B',
  walnut: '#25170F',
  gold: '#C69A43',
  champagne: '#E8D19B',
  ivory: '#F2E9D8',
  rose: '#B77B83',
  burgundy: '#54202A',
  forest: '#263C30',
} as const;

export const palettes: Record<'light' | 'dark', Palette> = {
  // Ivory pages, walnut ink, burgundy for actions and antique gold for ornament.
  light: {
    bg: '#F2E9D8',
    surface: '#FBF6EC',
    surface2: '#EADFCA',
    surface3: '#DACBAE',
    line: 'rgba(37,23,15,0.10)',
    lineStrong: 'rgba(37,23,15,0.22)',
    ink: '#100D0B',
    muted: '#6B5A49',
    faint: '#A29079',
    accent: '#54202A',
    accentSoft: 'rgba(84,32,42,0.09)',
    onAccent: '#F2E9D8',
    gold: '#A97E2E',
    goldSoft: 'rgba(198,154,67,0.18)',
    good: '#263C30',
    goodSoft: 'rgba(38,60,48,0.10)',
    danger: '#A3302A',
    glass: 'rgba(251,246,236,0.95)',
    glassEdge: 'rgba(37,23,15,0.08)',
    scrim: 'rgba(16,13,11,0.45)',
    shadow: 'rgba(37,23,15,0.14)',
  },
  // The library by lamplight: black and walnut, ivory text, champagne and gold.
  dark: {
    bg: '#100D0B',
    surface: '#1C130D',
    surface2: '#25170F',
    surface3: '#3A281B',
    line: 'rgba(232,209,155,0.12)',
    lineStrong: 'rgba(232,209,155,0.26)',
    ink: '#F2E9D8',
    muted: '#C2AD8A',
    faint: '#8A775D',
    accent: '#E8D19B',
    accentSoft: 'rgba(232,209,155,0.12)',
    onAccent: '#100D0B',
    gold: '#C69A43',
    goldSoft: 'rgba(198,154,67,0.18)',
    good: '#8DB39A',
    goodSoft: 'rgba(141,179,154,0.14)',
    danger: '#E08A7E',
    glass: 'rgba(28,19,13,0.94)',
    glassEdge: 'rgba(232,209,155,0.14)',
    scrim: 'rgba(0,0,0,0.6)',
    shadow: 'rgba(0,0,0,0.55)',
  },
};

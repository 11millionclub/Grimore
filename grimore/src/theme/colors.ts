/**
 * Grimore colour tokens.
 *
 * Warm ivory paper, soft ink, one ember accent for actions and a thin line of
 * gilt for the few ornaments. "dark" is the same idea by lamplight, used for
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

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#f4f0e8',
    surface: '#fffdf8',
    surface2: '#ede7dc',
    surface3: '#ddd4c5',
    line: 'rgba(45,32,20,0.09)',
    lineStrong: 'rgba(45,32,20,0.18)',
    ink: '#1d1915',
    muted: '#6a6056',
    faint: '#a1968a',
    accent: '#b4472c',
    accentSoft: 'rgba(180,71,44,0.1)',
    onAccent: '#fffaf2',
    gold: '#b08a42',
    goldSoft: 'rgba(176,138,66,0.14)',
    good: '#4d6a4b',
    goodSoft: 'rgba(77,106,75,0.12)',
    danger: '#b23a2e',
    glass: 'rgba(255,253,248,0.94)',
    glassEdge: 'rgba(45,32,20,0.08)',
    scrim: 'rgba(29,25,21,0.4)',
    shadow: 'rgba(56,38,20,0.12)',
  },
  dark: {
    bg: '#131110',
    surface: '#1c1917',
    surface2: '#27231f',
    surface3: '#36302a',
    line: 'rgba(240,226,204,0.08)',
    lineStrong: 'rgba(240,226,204,0.16)',
    ink: '#f2ebe0',
    muted: '#b3a796',
    faint: '#7f7466',
    accent: '#e0703f',
    accentSoft: 'rgba(224,112,63,0.16)',
    onAccent: '#1a0f08',
    gold: '#d2aa5e',
    goldSoft: 'rgba(210,170,94,0.16)',
    good: '#8fb08a',
    goodSoft: 'rgba(143,176,138,0.16)',
    danger: '#e2685c',
    glass: 'rgba(28,25,23,0.92)',
    glassEdge: 'rgba(240,226,204,0.1)',
    scrim: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

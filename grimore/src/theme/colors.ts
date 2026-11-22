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

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#f7f5f0',
    surface: '#ffffff',
    surface2: '#f0ede6',
    surface3: '#e2ddd2',
    line: 'rgba(25,26,31,0.07)',
    lineStrong: 'rgba(25,26,31,0.15)',
    ink: '#191a1f',
    muted: '#6b6b70',
    faint: '#a3a29e',
    accent: '#24395c',
    accentSoft: 'rgba(36,57,92,0.08)',
    onAccent: '#fdfbf6',
    gold: '#b8913f',
    goldSoft: 'rgba(184,145,63,0.14)',
    good: '#3f6b4f',
    goodSoft: 'rgba(63,107,79,0.1)',
    danger: '#b3362b',
    glass: 'rgba(255,255,255,0.94)',
    glassEdge: 'rgba(25,26,31,0.06)',
    scrim: 'rgba(15,16,20,0.38)',
    shadow: 'rgba(30,32,40,0.08)',
  },
  dark: {
    bg: '#0f1117',
    surface: '#171a21',
    surface2: '#20242d',
    surface3: '#2d323d',
    line: 'rgba(235,238,245,0.07)',
    lineStrong: 'rgba(235,238,245,0.15)',
    ink: '#eef0f4',
    muted: '#a6abb6',
    faint: '#707684',
    accent: '#a9bfe6',
    accentSoft: 'rgba(169,191,230,0.14)',
    onAccent: '#0f1117',
    gold: '#d8b56a',
    goldSoft: 'rgba(216,181,106,0.16)',
    good: '#8fbf9c',
    goodSoft: 'rgba(143,191,156,0.14)',
    danger: '#e57366',
    glass: 'rgba(23,26,33,0.92)',
    glassEdge: 'rgba(235,238,245,0.08)',
    scrim: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

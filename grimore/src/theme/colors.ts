/**
 * Grimore colour tokens.
 *
 * Dark is the default: near-black paper with one warm accent (ember).
 * Light is a soft off-white. No hex values live outside this file, except
 * the decorative Corner themes and Wrapped story fields.
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
  good: string;
  goodSoft: string;
  danger: string;
  glass: string;
  glassEdge: string;
  scrim: string;
  shadow: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  dark: {
    bg: '#0c0d0f',
    surface: '#15171a',
    surface2: '#1e2125',
    surface3: '#2a2e33',
    line: 'rgba(255,255,255,0.08)',
    lineStrong: 'rgba(255,255,255,0.14)',
    ink: '#f2f2f0',
    muted: '#9a9ea5',
    faint: '#6b6f76',
    accent: '#ff6a3d',
    accentSoft: 'rgba(255,106,61,0.14)',
    onAccent: '#160803',
    good: '#4fd18b',
    goodSoft: 'rgba(79,209,139,0.14)',
    danger: '#ff5a5f',
    glass: 'rgba(21,23,26,0.9)',
    glassEdge: 'rgba(255,255,255,0.1)',
    scrim: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.45)',
  },
  light: {
    bg: '#f3f4f2',
    surface: '#ffffff',
    surface2: '#eaebe8',
    surface3: '#dcddd9',
    line: 'rgba(17,18,20,0.08)',
    lineStrong: 'rgba(17,18,20,0.14)',
    ink: '#111214',
    muted: '#5c6066',
    faint: '#8a8e94',
    accent: '#e5501f',
    accentSoft: 'rgba(229,80,31,0.1)',
    onAccent: '#ffffff',
    good: '#1f9d5c',
    goodSoft: 'rgba(31,157,92,0.12)',
    danger: '#d9363e',
    glass: 'rgba(250,250,249,0.9)',
    glassEdge: 'rgba(255,255,255,0.7)',
    scrim: 'rgba(17,18,20,0.35)',
    shadow: 'rgba(40,44,50,0.16)',
  },
};

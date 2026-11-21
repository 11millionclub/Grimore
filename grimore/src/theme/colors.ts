/**
 * Grimore colour tokens.
 *
 * The app is an illuminated manuscript: aged parchment, iron-gall ink, wine
 * red for actions and gilt for ornaments. Parchment is the only app theme.
 * "dark" is a candle-lit leather palette kept for the camera, which needs a
 * dark surround. No hex values live outside this file, except the decorative
 * Corner themes and Wrapped story fields.
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
    bg: '#efe6d4',
    surface: '#f8f2e5',
    surface2: '#e6dac3',
    surface3: '#d8c9ac',
    line: 'rgba(84,58,30,0.16)',
    lineStrong: 'rgba(84,58,30,0.3)',
    ink: '#241a12',
    muted: '#6b5b49',
    faint: '#9c8b74',
    accent: '#6e2333',
    accentSoft: 'rgba(110,35,51,0.1)',
    onAccent: '#fbf3e4',
    gold: '#a3803c',
    goldSoft: 'rgba(163,128,60,0.16)',
    good: '#4e5e45',
    goodSoft: 'rgba(78,94,69,0.14)',
    danger: '#963530',
    glass: 'rgba(244,236,220,0.96)',
    glassEdge: 'rgba(163,128,60,0.5)',
    scrim: 'rgba(36,26,18,0.42)',
    shadow: 'rgba(60,40,18,0.22)',
  },
  dark: {
    bg: '#17110c',
    surface: '#221911',
    surface2: '#2e2318',
    surface3: '#3c2e20',
    line: 'rgba(232,210,170,0.1)',
    lineStrong: 'rgba(232,210,170,0.2)',
    ink: '#f1e6d0',
    muted: '#b8a68a',
    faint: '#86765f',
    accent: '#c9a45a',
    accentSoft: 'rgba(201,164,90,0.16)',
    onAccent: '#1a120a',
    gold: '#c9a45a',
    goldSoft: 'rgba(201,164,90,0.16)',
    good: '#8fa67f',
    goodSoft: 'rgba(143,166,127,0.16)',
    danger: '#d66a5f',
    glass: 'rgba(34,25,17,0.92)',
    glassEdge: 'rgba(201,164,90,0.35)',
    scrim: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

/**
 * GriMore colour tokens.
 *
 * Warm ivory paper, charcoal ink, a wine-red accent and a muted olive.
 * Every screen reads colours from here through `useTheme()`; no hex values
 * live outside this file.
 */

export type Palette = {
  /** Page background: warm ivory paper. */
  canvas: string;
  /** Raised surfaces: cards, sheets, inputs. */
  surface: string;
  /** Quiet fills: chips, skeletons, secondary panels. */
  surfaceMuted: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Tertiary text, placeholders, disabled. */
  inkSubtle: string;
  /** Hairlines. */
  border: string;
  borderStrong: string;
  /** Wine red: primary actions and key literary moments. */
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  /** Olive: success, progress, positive game feedback. */
  olive: string;
  oliveSoft: string;
  onOlive: string;
  /** Ochre: "close" feedback in games. */
  ochre: string;
  ochreSoft: string;
  danger: string;
  dangerSoft: string;
  /** Scrim over imagery. */
  overlay: string;
  shadow: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F7F5F0',
    surface: '#FFFFFF',
    surfaceMuted: '#EFECE5',
    ink: '#20201E',
    inkMuted: '#77756F',
    inkSubtle: '#A6A39B',
    border: '#E8E5DE',
    borderStrong: '#D8D3C8',
    accent: '#743B48',
    accentPressed: '#5D2E39',
    accentSoft: '#F2E7E9',
    onAccent: '#FBF8F3',
    olive: '#68745B',
    oliveSoft: '#E8EBE1',
    onOlive: '#FBF8F3',
    ochre: '#A9823C',
    ochreSoft: '#F3EBDA',
    danger: '#9B3A35',
    dangerSoft: '#F5E4E2',
    overlay: 'rgba(32, 32, 30, 0.55)',
    shadow: 'rgba(52, 40, 30, 0.10)',
  },
  dark: {
    canvas: '#161513',
    surface: '#1F1E1B',
    surfaceMuted: '#292724',
    ink: '#F1EEE7',
    inkMuted: '#A29E95',
    inkSubtle: '#6F6C65',
    border: '#2F2D29',
    borderStrong: '#403D37',
    accent: '#C98A97',
    accentPressed: '#B37683',
    accentSoft: '#3A262B',
    onAccent: '#1A1213',
    olive: '#9FAD8E',
    oliveSoft: '#2A2F25',
    onOlive: '#141611',
    ochre: '#D2AE6A',
    ochreSoft: '#3A3122',
    danger: '#E08A82',
    dangerSoft: '#3B2422',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
};

/**
 * Backgrounds for "My Corner". Each one is a complete mini-palette so text
 * stays legible whatever the reader chooses.
 */
export const cornerThemes = {
  ivory: { label: 'Ivory', background: '#F7F5F0', panel: '#FFFFFF', ink: '#20201E', muted: '#77756F', accent: '#743B48', shelf: '#E2DCCF' },
  linen: { label: 'Linen', background: '#EFE8DC', panel: '#F8F3EA', ink: '#2A2622', muted: '#7B7266', accent: '#8A4B3A', shelf: '#D9CDB8' },
  library: { label: 'Library', background: '#2C2420', panel: '#382E29', ink: '#F3EBDD', muted: '#BFAF98', accent: '#D8A26A', shelf: '#4A3B33' },
  night: { label: 'Night', background: '#171A21', panel: '#20242D', ink: '#ECEEF2', muted: '#9AA0AD', accent: '#C9A6E0', shelf: '#2B303B' },
  olive: { label: 'Olive', background: '#E6E8DD', panel: '#F2F3EC', ink: '#232720', muted: '#6B725F', accent: '#56613F', shelf: '#CDD2BF' },
} as const;

export type CornerThemeId = keyof typeof cornerThemes;

/** Deterministic, harmonious tones for typographic placeholder covers. */
export const coverTones = [
  { bg: '#743B48', ink: '#F7EFE6' },
  { bg: '#68745B', ink: '#F5F1E6' },
  { bg: '#2F3A4A', ink: '#EEE8DC' },
  { bg: '#A9823C', ink: '#FFF8EA' },
  { bg: '#3E3A36', ink: '#EFE6D6' },
  { bg: '#8C5A4A', ink: '#FBF1E4' },
  { bg: '#4E5F63', ink: '#F1EEE6' },
  { bg: '#C9B79C', ink: '#2B2520' },
] as const;

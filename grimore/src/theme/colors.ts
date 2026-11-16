/**
 * GriMore colour tokens — "the grimoire".
 *
 * Light is aged parchment and iron-gall ink; dark is a candlelit reading room.
 * Wine red is the wax seal, antique gold is gilt on a spine, forest green is
 * the old leather binding. No hex values live outside this file.
 */

export type Palette = {
  /** Page background: parchment (light) or candlelit oak (dark). */
  canvas: string;
  /** Raised surfaces: cards, sheets, inputs. */
  surface: string;
  /** Quiet fills: chips, skeletons, secondary panels. */
  surfaceMuted: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  border: string;
  borderStrong: string;
  /** Wax-seal wine: primary actions. */
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  /** Antique gold: ornaments, highlights, achievements. */
  gold: string;
  goldSoft: string;
  /** Forest leather: success and progress. */
  olive: string;
  oliveSoft: string;
  onOlive: string;
  /** Ochre: "close" feedback in games. */
  ochre: string;
  ochreSoft: string;
  danger: string;
  dangerSoft: string;
  /** Wooden shelf under books. */
  shelf: string;
  shelfEdge: string;
  overlay: string;
  shadow: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F3ECDF',
    surface: '#FBF7EF',
    surfaceMuted: '#E9E0CF',
    ink: '#211B17',
    inkMuted: '#6E6357',
    inkSubtle: '#A1957F',
    border: '#E1D5BF',
    borderStrong: '#CDBC9E',
    accent: '#6E2333',
    accentPressed: '#561A27',
    accentSoft: '#EFDDDD',
    onAccent: '#FBF4E8',
    gold: '#A3803C',
    goldSoft: '#EFE2C4',
    olive: '#4E5E45',
    oliveSoft: '#E1E5D6',
    onOlive: '#F8F4EA',
    ochre: '#A9823C',
    ochreSoft: '#F2E7D0',
    danger: '#963530',
    dangerSoft: '#F4E0DC',
    shelf: '#7A5534',
    shelfEdge: '#5A3C23',
    overlay: 'rgba(25, 18, 12, 0.55)',
    shadow: 'rgba(60, 40, 20, 0.14)',
  },
  dark: {
    canvas: '#13100D',
    surface: '#1C1814',
    surfaceMuted: '#28221C',
    ink: '#EFE5D1',
    inkMuted: '#A99D87',
    inkSubtle: '#6E6455',
    border: '#322A21',
    borderStrong: '#4A3E30',
    accent: '#C77A8A',
    accentPressed: '#B06676',
    accentSoft: '#3A2228',
    onAccent: '#1A0F11',
    gold: '#D3AF68',
    goldSoft: '#3A3020',
    olive: '#98AC88',
    oliveSoft: '#262D20',
    onOlive: '#12160F',
    ochre: '#D2AE6A',
    ochreSoft: '#3A3122',
    danger: '#E08A82',
    dangerSoft: '#3B2422',
    shelf: '#4A3322',
    shelfEdge: '#2E1F14',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
};

/** Wax-seal colours a reader can choose for their Nook. */
export const sealColors = {
  wine: { label: 'Wine', color: '#6E2333', light: '#C77A8A' },
  emerald: { label: 'Emerald', color: '#1F5B45', light: '#7FC2A4' },
  sapphire: { label: 'Sapphire', color: '#26406E', light: '#8FA9DB' },
  amethyst: { label: 'Amethyst', color: '#523066', light: '#B999D0' },
  gilt: { label: 'Gilt', color: '#9A7432', light: '#E0BE77' },
  obsidian: { label: 'Obsidian', color: '#1E1B1A', light: '#BDB3A6' },
} as const;
export type SealColorId = keyof typeof sealColors;

/** Shelf woods for the Nook. */
export const shelfWoods = {
  oak: { label: 'Oak', top: '#8A6239', edge: '#64442A' },
  walnut: { label: 'Walnut', top: '#5C3D27', edge: '#3E2818' },
  ebony: { label: 'Ebony', top: '#2C2420', edge: '#171210' },
  birch: { label: 'Birch', top: '#C9AE84', edge: '#A08458' },
} as const;
export type ShelfWoodId = keyof typeof shelfWoods;

/** Leather-and-cloth tones for typographic placeholder covers and spines. */
export const coverTones = [
  { bg: '#6E2333', ink: '#F4E7D2' },
  { bg: '#2F4A3A', ink: '#EFE6D0' },
  { bg: '#26344F', ink: '#EDE4D2' },
  { bg: '#8E6B33', ink: '#FFF6E2' },
  { bg: '#3A302A', ink: '#E9DCC4' },
  { bg: '#7B4A36', ink: '#FBEEDD' },
  { bg: '#41545A', ink: '#EEEADF' },
  { bg: '#B9A47F', ink: '#2A221B' },
  { bg: '#4B2E44', ink: '#F1E3DA' },
] as const;

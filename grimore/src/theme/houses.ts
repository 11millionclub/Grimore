/**
 * House colour tokens. Components read these, never raw hex values.
 *
 * Each House has:
 *   primary    – the House colour (fills, rings, banners)
 *   onPrimary  – text and icons placed on `primary` (WCAG AA, 4.5:1+)
 *   ink        – House-coloured text on parchment (4.5:1+ on bg, surface and surface2)
 *   inkDark    – House-coloured text on the dark palette (4.5:1+)
 *   secondary  – the House's second colour (patterns, ribbons)
 *
 * Values follow the House brief; only lightness was adjusted where a pair
 * failed contrast (Thorn primary, Hourglass and Lantern ink, Quill and Thorn
 * on dark).
 */
export type HouseId = 'lantern' | 'quill' | 'thorn' | 'hourglass';

export const HOUSE_IDS: HouseId[] = ['lantern', 'quill', 'thorn', 'hourglass'];

export type HouseTokens = { primary: string; onPrimary: string; ink: string; inkDark: string; secondary: string };

export const houseTokens: Record<HouseId, HouseTokens> = {
  lantern: { primary: '#E9A23B', onPrimary: '#1A120A', ink: '#875100', inkDark: '#E9A23B', secondary: '#2B2620' },
  quill: { primary: '#4C5BD4', onPrimary: '#FBF3E4', ink: '#3442B0', inkDark: '#6975DB', secondary: '#C9CED8' },
  thorn: { primary: '#CF305A', onPrimary: '#FBF3E4', ink: '#A8213F', inkDark: '#D54B70', secondary: '#F4C7D2' },
  hourglass: { primary: '#2A9D8F', onPrimary: '#1A120A', ink: '#1E6B61', inkDark: '#2A9D8F', secondary: '#C77D4A' },
};

/** House names are proper nouns and are never translated. */
export const HOUSE_NAMES: Record<HouseId, string> = { lantern: 'Lantern', quill: 'Quill', thorn: 'Thorn', hourglass: 'Hourglass' };
export const HOUSE_RIVALS: Record<HouseId, HouseId> = { lantern: 'hourglass', hourglass: 'lantern', quill: 'thorn', thorn: 'quill' };

export const isHouseId = (v: unknown): v is HouseId => typeof v === 'string' && (HOUSE_IDS as string[]).includes(v);

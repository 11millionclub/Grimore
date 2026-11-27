/**
 * House colour tokens. Components read these, never raw hex values.
 *
 * Each House has:
 *   primary    – the House colour from the Sorting specification (fills, rings, banners)
 *   onPrimary  – text and icons placed on `primary` (WCAG AA, 4.5:1+)
 *   ink        – House-coloured text on parchment (4.5:1+ on bg, surface and surface2)
 *   inkDark    – House-coloured text on the dark palette (4.5:1+)
 *   secondary  – the House's second colour (patterns, ribbons)
 *
 * Primaries are the specified colours exactly; ink shades only darken or
 * lighten them where text would fail contrast.
 */
export type HouseId = 'wanderers' | 'weavers' | 'luminaries' | 'seekers';

/** Fixed House order (the specification's vector order). */
export const HOUSE_IDS: HouseId[] = ['wanderers', 'weavers', 'luminaries', 'seekers'];

export type HouseTokens = { primary: string; onPrimary: string; ink: string; inkDark: string; secondary: string };

export const houseTokens: Record<HouseId, HouseTokens> = {
  // Deep navy · compass
  wanderers: { primary: '#152D49', onPrimary: '#F2E9D8', ink: '#152D49', inkDark: '#8FB0D8', secondary: '#E6D7B4' },
  // Dark salmon / terracotta · endless thread
  weavers: { primary: '#C76849', onPrimary: '#1A120A', ink: '#9A4429', inkDark: '#E08E70', secondary: '#F3D2C4' },
  // Mustard yellow · starburst
  luminaries: { primary: '#DDAC42', onPrimary: '#1A120A', ink: '#7A5600', inkDark: '#DDAC42', secondary: '#F6E2A8' },
  // Blue-green / teal · key
  seekers: { primary: '#3A8884', onPrimary: '#06100F', ink: '#225F5B', inkDark: '#5FB8B2', secondary: '#D3E7E5' },
};

/** House names are proper nouns and are never translated. */
export const HOUSE_NAMES: Record<HouseId, string> = { wanderers: 'Wanderers', weavers: 'Weavers', luminaries: 'Luminaries', seekers: 'Seekers' };

/** Weekly duel pairs: the new against the familiar, understanding against solving. */
export const HOUSE_RIVALS: Record<HouseId, HouseId> = { wanderers: 'weavers', weavers: 'wanderers', luminaries: 'seekers', seekers: 'luminaries' };
export const DUEL_PAIRS: [HouseId, HouseId][] = [
  ['wanderers', 'weavers'],
  ['luminaries', 'seekers'],
];

/** House-coloured text for the current light or dark screen. */
export const houseInk = (h: HouseId, dark: boolean) => (dark ? houseTokens[h].inkDark : houseTokens[h].ink);
/** A House's tokens with `ink` already chosen for the current light or dark screen. */
export const themedHouse = (h: HouseId, dark: boolean): HouseTokens => ({ ...houseTokens[h], ink: houseInk(h, dark) });

export const isHouseId = (v: unknown): v is HouseId => typeof v === 'string' && (HOUSE_IDS as string[]).includes(v);

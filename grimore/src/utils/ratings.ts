/** Ratings run from half a star to six stars; spice from none to five chillies. */
export const MAX_STARS = 6;
export const STAR_STEPS = Array.from({ length: MAX_STARS }, (_, i) => i + 1);
export const MAX_SPICE = 5;
export const SPICE_STEPS = Array.from({ length: MAX_SPICE }, (_, i) => i + 1);
export const SPICE_LABELS = ['No spice', 'A little warm', 'Warm', 'Spicy', 'Very spicy', 'On fire'] as const;

/** Pure helpers for the daily-game screens (unit tested). */

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

/** Blur and zoom for the Hidden Cover at each miss level (0 = start, 5 = fully revealed). */
export const COVER_BLUR = [24, 16, 10, 6, 3, 0] as const;
export const COVER_ZOOM = [3.4, 2.6, 2, 1.6, 1.25, 1] as const;
export function coverLevel(level: number) {
  const l = Math.max(0, Math.min(5, Math.round(level)));
  return { blur: COVER_BLUR[l], zoom: COVER_ZOOM[l] };
}

/** Is a keyboard letter part of the revealed title? (accent-insensitive) */
export function letterInMask(mask: string, letter: string) {
  return fold(mask).includes(fold(letter));
}

/** Split a hangman mask into words of tiles, keeping punctuation tiles. */
export function maskWords(mask: string): string[][] {
  return mask
    .split(' ')
    .filter((w) => w.length)
    .map((w) => [...w]);
}

/** Move an item one step in a list, skipping over locked slots. Returns the same list if impossible. */
export function moveUnlocked<T>(order: T[], index: number, dir: -1 | 1, locked: (T | null)[]): T[] {
  if (locked[index]) return order;
  let target = index + dir;
  while (target >= 0 && target < order.length && locked[target]) target += dir;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Put locked items into their slots and keep the rest in their current relative order. */
export function applyLocks<T>(order: T[], locked: (T | null)[]): T[] {
  const lockedSet = new Set(locked.filter((x): x is T => x !== null));
  const free = order.filter((x) => !lockedSet.has(x));
  return locked.map((l) => (l !== null ? l : (free.shift() as T)));
}

/** Spoiler-free share text: tries as coloured squares. */
export function shareText(name: string, number: number, won: boolean, seconds: number | null, misses: number) {
  const squares = won ? `${'🟧'.repeat(Math.min(misses, 9))}🟩` : '🟧'.repeat(Math.min(misses, 9)) + '⬛';
  const time = won && seconds !== null ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'not this time';
  return `Grimore ${name} #${number} · ${time}\n${squares}`;
}

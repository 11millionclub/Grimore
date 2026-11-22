import { useEffect, useReducer } from 'react';

import { readerHouses } from '@/services/houses';
import type { HouseId } from '@/theme/houses';

/**
 * A reader's House for badges in lists (feed, leaderboards). Requests made in
 * the same moment are batched into one reader_houses call and cached for the
 * session; hidden Houses come back empty.
 */
const cache = new Map<string, HouseId | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const ids = [...pending];
  pending.clear();
  if (!ids.length) return;
  readerHouses(ids).then(
    (map) => {
      ids.forEach((id) => cache.set(id, map[id] ?? null));
      listeners.forEach((l) => l());
    },
    () => ids.forEach((id) => cache.delete(id)),
  );
}

export function clearHouseCache() {
  cache.clear();
  listeners.forEach((l) => l());
}

export function useHouseOf(userId: string | null | undefined): HouseId | null {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    if (userId && !cache.has(userId)) {
      pending.add(userId);
      if (!timer) timer = setTimeout(flush, 30);
    }
    return () => {
      listeners.delete(rerender);
    };
  }, [userId]);
  return userId ? (cache.get(userId) ?? null) : null;
}

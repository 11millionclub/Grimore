import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { create } from 'zustand';

import { pauseAmbient, playAmbient, resumeAmbient, stopAmbient, type TrackId } from '@/lib/ambient';

const TAG = 'reading-session';
const awake = (on: boolean) => {
  try {
    if (on) void activateKeepAwakeAsync(TAG).catch(() => {});
    else void deactivateKeepAwake(TAG);
  } catch {
    // The screen may still dim; the timer keeps counting from timestamps either way.
  }
};

type State = {
  /** When the current stretch started (ms), null while paused or idle. */
  runningSince: number | null;
  /** Seconds banked from earlier stretches of this session. */
  banked: number;
  active: boolean;
  bookId: string | null;
  track: TrackId | null;
  setBook: (id: string | null) => void;
  setTrack: (t: TrackId | null) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Ends the session and returns how many seconds it lasted. */
  finish: () => number;
  reset: () => void;
};

export const elapsed = (s: Pick<State, 'runningSince' | 'banked'>, now = Date.now()) => s.banked + (s.runningSince ? Math.floor((now - s.runningSince) / 1000) : 0);

/** A focused reading session: a stopwatch that survives leaving the screen, with optional background sound. */
export const useReadingSession = create<State>((set, get) => ({
  runningSince: null,
  banked: 0,
  active: false,
  bookId: null,
  track: null,
  setBook: (bookId) => set({ bookId }),
  setTrack: (track) => {
    set({ track });
    if (!get().active) return;
    if (track) {
      playAmbient(track);
      if (!get().runningSince) pauseAmbient();
    } else stopAmbient();
  },
  start: () => {
    set({ active: true, runningSince: Date.now(), banked: 0 });
    const { track } = get();
    if (track) playAmbient(track);
    awake(true);
  },
  pause: () => {
    const s = get();
    if (!s.runningSince) return;
    set({ banked: elapsed(s), runningSince: null });
    pauseAmbient();
    awake(false);
  },
  resume: () => {
    if (get().runningSince) return;
    set({ runningSince: Date.now() });
    resumeAmbient();
    awake(true);
  },
  finish: () => {
    const secs = elapsed(get());
    stopAmbient();
    awake(false);
    set({ active: false, runningSince: null, banked: 0 });
    return secs;
  },
  reset: () => {
    stopAmbient();
    awake(false);
    set({ active: false, runningSince: null, banked: 0 });
  },
}));

export const clock = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Challenge identity is the UTC calendar date: every reader in the world gets
 * the same puzzle. These helpers keep that logic in one testable place.
 */

/** YYYY-MM-DD for the UTC day containing `now`. */
export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Add whole days to a YYYY-MM-DD key, staying in UTC. */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateKey(d);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Milliseconds until the next UTC midnight, when new challenges unlock. */
export function msUntilNextChallenge(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

/** Human date for a challenge key, shown in the reader's locale. */
export function formatChallengeDate(key: string, locale?: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still reading';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - Date.parse(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** h:mm:ss until the next UTC midnight (new daily games). */
export function clockUntilNextChallenge(now: Date = new Date()): string {
  const s = Math.max(0, Math.floor(msUntilNextChallenge(now) / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 14 482 style thousands separator (thin, readable, locale neutral). */
export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

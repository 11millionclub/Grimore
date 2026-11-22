/**
 * Maps backend error codes to calm, human messages. Raw database errors are
 * never shown to readers.
 */
import en from '@/i18n/en';

const known: Record<string, string> = {
  ...en.errors,
  rate_limited: 'You are doing that a little too often. Please wait a moment.',
  attempt_finished: 'You have already finished today’s challenge.',
  no_guesses_left: 'No guesses left for today.',
  no_hints_left: 'All hints have been used.',
  already_guessed: 'You have already tried that book.',
  challenge_not_today: 'This challenge is no longer open. A new one arrives at midnight UTC.',
  challenge_not_found: 'This challenge could not be found.',
  book_not_found: 'That book is not in the catalogue yet.',
  invalid_option: 'Please choose one of the options.',
  not_authenticated: 'Please sign in again.',
  blocked: 'You cannot interact with this reader.',
  'Invalid login credentials': 'That email and password do not match.',
  'User already registered': 'An account with this email already exists.',
  'Email not confirmed': 'Please confirm your email address first. Check your inbox.',
};

export class AppError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type MaybeBackendError = { message?: string; code?: string; details?: string | null } | null | undefined;

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = error as MaybeBackendError;
  const message = e?.message ?? '';
  for (const [key, friendly] of Object.entries(known)) {
    if (message.includes(key)) return new AppError(friendly, key);
  }
  if (e?.code === '23505') return new AppError('That already exists.', e.code);
  if (e?.code === '42501') return new AppError('You do not have permission to do that.', e.code);
  if (message.toLowerCase().includes('network') || message.includes('Failed to fetch')) {
    return new AppError('You appear to be offline. Check your connection and try again.', 'network');
  }
  return new AppError('Something went wrong. Please try again.', e?.code);
}

/** Unwrap a Supabase response, throwing a friendly AppError on failure. */
export function unwrap<R extends { data: unknown; error: unknown }>(result: R): Extract<R, { error: null }>['data'] {
  if (result.error) throw toAppError(result.error);
  return result.data as Extract<R, { error: null }>['data'];
}

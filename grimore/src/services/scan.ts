import { FunctionsHttpError } from '@supabase/supabase-js';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type ScannedBook = {
  title: string;
  author: string;
  confidence: number;
  match: { id: string; title: string; cover_url: string | null; first_published_year: number | null; authors: string | null } | null;
};

const messages: Record<string, string> = {
  scanner_not_configured: 'The shelf scanner is not switched on yet. Ask the app owner to add the AI key in Supabase.',
  rate_limited: 'That is a lot of photos. Please wait a little before scanning again.',
  invalid_image: 'That photo could not be read. Try again with better light.',
  unreadable_image: 'That photo could not be read. Try again with better light.',
  refused: 'This photo could not be processed.',
  busy: 'The scanner is busy. Try again in a minute.',
  scanner_paused: 'The scanner is paused for a moment. You can still search or scan the barcode.',
  scanner_busy: 'The scanner has reached today’s limit. Search or scan the barcode instead.',
  scan_daily_limit: 'You have used today’s photo scans. Search or scan the barcode instead.',
  could_not_start: 'The scan could not start. Please try again.',
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('scan-shelf', { body });
  if (error) {
    let code = 'scanner_unavailable';
    if (error instanceof FunctionsHttpError) {
      try {
        code = ((await error.context.json()) as { error?: string }).error ?? code;
      } catch {
        /* keep default */
      }
    }
    throw new AppError(messages[code] ?? 'The scanner is unavailable right now. Please try again.', code);
  }
  return data as T;
}

/** Send a shelf photo to the AI scanner. `base64` is the JPEG without a data: prefix. */
export function scanShelf(base64: string) {
  return invoke<{ job_id: string; books: ScannedBook[] }>({ image: base64, media_type: 'image/jpeg', mode: 'shelf' });
}

/** Read the sentences on a photographed page. */
export function scanQuote(base64: string) {
  return invoke<{ job_id: string; sentences: string[]; page: number | null }>({ image: base64, media_type: 'image/jpeg', mode: 'quote' });
}

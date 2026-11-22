import { supabase } from '@/lib/supabase';

export type AnalyticsEvent =
  | 'sorting_started'
  | 'sorting_question_answered'
  | 'sorting_skipped'
  | 'house_revealed'
  | 'house_chosen_from_two'
  | 'house_share_tapped'
  | 'house_changed'
  | 'house_hidden_toggled'
  | 'house_cup_viewed'
  | 'ritual_joined';

/** Fire-and-forget product event. Never blocks the UI and never throws. */
export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean | null> = {}) {
  void supabase
    .from('analytics_events')
    .insert({ name, props })
    .then(
      () => undefined,
      () => undefined,
    );
}

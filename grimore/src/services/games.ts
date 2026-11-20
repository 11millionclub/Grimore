import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type GameId = 'hangman' | 'cover' | 'clues' | 'timeline';

export const GAMES: { id: GameId; name: string; desc: string; rules: string[] }[] = [
  {
    id: 'hangman',
    name: 'Hangman',
    desc: 'One title a day. Six candles.',
    rules: ['Guess the title letter by letter.', 'Each wrong letter puts out a candle and adds 10 s.', 'You can ask for one letter, also for 10 s.'],
  },
  {
    id: 'cover',
    name: 'Hidden cover',
    desc: 'The cover sharpens with every miss.',
    rules: ['The cover starts blurred and zoomed in.', 'Each wrong guess reveals more and adds 10 s.', 'You have four misses.'],
  },
  {
    id: 'clues',
    name: 'Clues',
    desc: 'Five clues. The sooner, the better.',
    rules: ['You start with one clue.', 'Each extra clue or wrong guess adds 10 s.', 'Type the title and pick it from the list.'],
  },
  {
    id: 'timeline',
    name: 'Timeline',
    desc: 'Put five books in order of publication.',
    rules: ['Order the books from oldest to newest.', 'The ones in the right place lock.', 'Each wrong check adds 10 s.'],
  },
];
export const gameMeta = (id: GameId) => GAMES.find((g) => g.id === id)!;

export type BookCard = { id: string; title: string; authors: string[]; cover_url?: string | null; first_published_year?: number | null };

export type GameState = {
  id: string;
  game: GameId;
  number: number;
  challenge_date: string;
  payload: {
    mask?: string;
    max_misses?: number;
    year?: number | null;
    genre?: string | null;
    cover_url?: string;
    max_errors?: number;
    options?: BookCard[];
    total_clues?: number;
    books?: BookCard[];
  };
  attempt: {
    status: 'in_progress' | 'won' | 'lost';
    started_at: string;
    completed_at: string | null;
    penalty_seconds: number;
    time_seconds: number | null;
    misses: number;
    hints_used: number;
    xp_awarded: number;
  } | null;
  view: {
    mask?: string;
    guessed?: string[];
    misses?: number | BookCard[];
    hinted?: boolean;
    wrong?: string[];
    removed?: string[];
    level?: number;
    clues?: string[];
    locked?: (string | null)[];
    last?: boolean[] | null;
  };
  solution: { title?: string; book?: BookCard; order?: BookCard[] } | null;
};

export type BoardRow = {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  time_seconds: number;
  tries?: number;
  won?: number;
  is_me: boolean;
};

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export async function getTodayGames(): Promise<GameState[]> {
  return unwrap(await supabase.rpc('get_today_games')) as unknown as GameState[];
}
export async function getGameState(id: string): Promise<GameState> {
  return unwrap(await supabase.rpc('get_game_state', { p_challenge: id })) as unknown as GameState;
}
export async function startGame(id: string): Promise<GameState> {
  return unwrap(await supabase.rpc('start_game', { p_challenge: id })) as unknown as GameState;
}
export async function guessLetter(id: string, letter: string): Promise<GameState> {
  return unwrap(await supabase.rpc('hangman_guess', { p_challenge: id, p_letter: letter })) as unknown as GameState;
}
export async function guessCover(id: string, bookId: string): Promise<GameState> {
  return unwrap(await supabase.rpc('cover_guess', { p_challenge: id, p_book: bookId })) as unknown as GameState;
}
export async function guessClues(id: string, bookId: string): Promise<GameState> {
  return unwrap(await supabase.rpc('clues_guess', { p_challenge: id, p_book: bookId })) as unknown as GameState;
}
export async function submitTimeline(id: string, order: string[]): Promise<GameState> {
  return unwrap(await supabase.rpc('timeline_submit', { p_challenge: id, p_order: order })) as unknown as GameState;
}
export async function takeHint(id: string): Promise<GameState> {
  return unwrap(await supabase.rpc('game_hint', { p_challenge: id })) as unknown as GameState;
}
export async function getLeaderboard(id: string): Promise<BoardRow[]> {
  return unwrap(await supabase.rpc('get_game_leaderboard', { p_challenge: id })) as unknown as BoardRow[];
}
export async function getWeeklyLeaderboard(): Promise<BoardRow[]> {
  return unwrap(await supabase.rpc('get_weekly_leaderboard')) as unknown as BoardRow[];
}

/** Elapsed seconds on the client clock, plus penalties; the server's final time wins. */
export function liveSeconds(state: GameState | undefined, now = Date.now()) {
  const a = state?.attempt;
  if (!a) return 0;
  if (a.time_seconds !== null) return a.time_seconds;
  return Math.max(0, Math.floor((now - Date.parse(a.started_at)) / 1000)) + a.penalty_seconds;
}

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  earned_at: string | null;
  progress: number;
  target: number;
};

export async function getAchievements(userId?: string): Promise<Achievement[]> {
  return unwrap(await supabase.rpc('get_achievements', userId ? { p_user: userId } : {})) as unknown as Achievement[];
}

export async function getGameStreak(userId: string) {
  return unwrap(await supabase.from('user_streaks').select('current_streak, longest_streak, last_active_date').eq('user_id', userId).maybeSingle());
}

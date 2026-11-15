/** Shapes returned by the game RPCs (see migration 0004, private.challenge_state). */

export type GameType = 'bookle' | 'cover_reveal' | 'quiz';
export type AttemptStatus = 'in_progress' | 'won' | 'lost';

export type BookCard = {
  id: string;
  title: string;
  cover_url: string | null;
  first_published_year: number | null;
  authors: string[];
};

export type FeedbackResult =
  | 'match'
  | 'miss'
  | 'partial'
  | 'unknown'
  | 'earlier'
  | 'later'
  | 'more'
  | 'fewer'
  | 'longer'
  | 'shorter';

export type BookleFeedback = {
  decade: { value: number | null; result: FeedbackResult };
  genre: { value: string | null; result: FeedbackResult };
  nationality: { value: string | null; result: FeedbackResult };
  title_words: { value: number; result: FeedbackResult };
  length: { value: number | null; result: FeedbackResult };
  author: { value: string | null; result: FeedbackResult };
};

export type GameAnswer = {
  position: number;
  is_correct: boolean;
  selected_index: number | null;
  feedback: BookleFeedback | null;
  book: BookCard | null;
};

export type Attempt = {
  status: AttemptStatus;
  guesses_count: number;
  hints_used: number;
  score: number;
  xp_awarded: number;
  completed_at: string | null;
};

type Base<G extends GameType, P> = {
  id: string;
  game: G;
  challenge_date: string;
  difficulty: number;
  payload: P;
  attempt: Attempt | null;
  answers: GameAnswer[];
  clues: { author_initials?: string };
  solution: { book: BookCard | null; correct_index: number | null; explanation: string | null } | null;
};

export type BookleChallenge = Base<'bookle', { max_guesses: number }>;
export type CoverRevealChallenge = Base<
  'cover_reveal',
  { cover_url: string; max_hints: number; reveal_seed: number; options: Omit<BookCard, 'cover_url'>[] }
>;
export type QuizChallenge = Base<'quiz', { prompt: string; options: string[]; category: string }>;
export type Challenge = BookleChallenge | CoverRevealChallenge | QuizChallenge;

export type Progress = {
  current_streak: number;
  longest_streak: number;
  completed_days: number;
  perfect_days: number;
  played_today: boolean;
  total_xp: number;
  calendar: { date: string; games: number; perfect: boolean }[];
  games: Partial<
    Record<GameType, { played: number; won: number; current_streak: number; longest_streak: number; distribution: Record<string, number> }>
  >;
};

export const GAME_META: Record<GameType, { name: string; tagline: string; icon: 'grid' | 'image' | 'help-circle'; xp: number; route: string }> = {
  bookle: { name: 'Bookle', tagline: 'Six guesses to name the book', icon: 'grid', xp: 15, route: '/play/bookle' },
  cover_reveal: { name: 'Cover Reveal', tagline: 'Name it from a glimpse of its cover', icon: 'image', xp: 15, route: '/play/cover-reveal' },
  quiz: { name: 'Literary Quiz', tagline: 'One question, one answer', icon: 'help-circle', xp: 10, route: '/play/quiz' },
};

export const PERFECT_DAY_BONUS = 15;

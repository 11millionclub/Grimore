export type Arch = 'night' | 'saga' | 'quotes' | 'archive' | 'sprint';

export const ARCHETYPES: Record<Arch, { name: string; line: string; traits: string }> = {
  night: { name: 'Night Explorer', line: 'You read while the world sleeps, and look for books that keep you thinking in the dark.', traits: 'Dark, mysterious and literary, mostly after 10 pm.' },
  saga: { name: 'Saga Devourer', line: 'Big worlds, long series and maps on the first page. The more volumes, the better.', traits: 'Epic fantasy and long series.' },
  quotes: { name: 'Quote Collector', line: 'You read slowly, underline a lot and return to the same pages years later.', traits: 'Beautiful prose, slow and lyrical reads.' },
  archive: { name: 'Archivist', line: 'Classics, prize winners and lists to complete. You have a method and you follow it.', traits: 'Classics and award winners, read in order.' },
  sprint: { name: 'Sprint Reader', line: 'Plot first. You turn pages fast and finish books in a weekend.', traits: 'Fast-paced plots, finished in days.' },
};

export type QuizOption = { id: string; label: string; sub?: string; icon: string; score: Partial<Record<Arch, number>> };
export type QuizQuestion = { id: string; title: string; options: QuizOption[] };

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'when',
    title: 'When do you read most?',
    options: [
      { id: 'morning', label: 'In the morning', sub: 'with the first coffee', icon: 'sunrise', score: { archive: 2 } },
      { id: 'lunch', label: 'In short breaks', sub: 'commutes, lunch, queues', icon: 'coffee', score: { sprint: 2 } },
      { id: 'evening', label: 'In the evening', sub: 'on the sofa', icon: 'couch', score: { quotes: 1, saga: 1 } },
      { id: 'night', label: 'After midnight', sub: 'just one more chapter', icon: 'moon', score: { night: 3 } },
    ],
  },
  {
    id: 'length',
    title: 'What length do you prefer?',
    options: [
      { id: 'short', label: 'Short', sub: 'under 300 pages', icon: 'feather', score: { sprint: 1, night: 1 } },
      { id: 'mid', label: 'Medium', sub: '300 to 500 pages', icon: 'book', score: { quotes: 1, archive: 1 } },
      { id: 'long', label: 'Doorstoppers', sub: '600 pages or more', icon: 'books', score: { saga: 3 } },
      { id: 'any', label: 'Anything', sub: 'if it is good', icon: 'shuffle', score: {} },
    ],
  },
  {
    id: 'hook',
    title: 'What hooks you on a book?',
    options: [
      { id: 'people', label: 'The characters', icon: 'people', score: { quotes: 1, night: 1 } },
      { id: 'world', label: 'The world', icon: 'globe', score: { saga: 2 } },
      { id: 'plot', label: 'The plot', icon: 'lightning', score: { sprint: 2 } },
      { id: 'prose', label: 'The writing', icon: 'quotes', score: { quotes: 3 } },
    ],
  },
  {
    id: 'next',
    title: 'How do you choose the next one?',
    options: [
      { id: 'friends', label: 'Friends’ recommendations', icon: 'people', score: { night: 1, sprint: 1 } },
      { id: 'awards', label: 'Prizes and lists', icon: 'trophy', score: { archive: 3 } },
      { id: 'cover', label: 'By the cover', sub: 'no shame at all', icon: 'image', score: { sprint: 1 } },
      { id: 'pile', label: 'From the endless pile', sub: 'waiting for years', icon: 'stack', score: { saga: 1, quotes: 1 } },
    ],
  },
];

/** Score answers (question id -> option id) and genre slugs into an archetype. Ties keep the listed order. */
export function scoreArchetype(answers: Record<string, string>, genreSlugs: string[]): Arch {
  const total: Record<Arch, number> = { night: 0, saga: 0, quotes: 0, archive: 0, sprint: 0 };
  QUESTIONS.forEach((q) => {
    const o = q.options.find((x) => x.id === answers[q.id]);
    Object.entries(o?.score ?? {}).forEach(([k, v]) => (total[k as Arch] += v ?? 0));
  });
  const has = (...s: string[]) => s.some((x) => genreSlugs.includes(x));
  if (has('fantasy', 'romantasy')) total.saga += 1;
  if (has('classics', 'poetry', 'literary-fiction')) total.quotes += 1;
  if (has('thriller', 'mystery', 'crime')) total.sprint += 1;
  if (has('gothic', 'horror', 'magical-realism')) total.night += 1;
  return (Object.entries(total) as [Arch, number][]).reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
}

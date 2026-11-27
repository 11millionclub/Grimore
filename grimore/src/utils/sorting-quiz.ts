/**
 * The House Sorting Quiz, exactly as approved in the GRIMORE House Sorting
 * specification. Each answer keeps its text and its four-House score vector
 * together, in the fixed order [Wanderers, Weavers, Luminaries, Seekers].
 * The option ids (a–d) are stable keys for the server, not display letters:
 * options are shuffled on screen and never show a letter or a House.
 *
 * The server holds its own copy of these vectors (public.submit_sorting) and
 * re-scores every submission; tests check the two copies match.
 */
export type Vector = [number, number, number, number];
export type QuizOption = { id: 'a' | 'b' | 'c' | 'd'; text: string; v: Vector };
export type QuizQuestion = { id: string; title: string; prompt: string; options: QuizOption[] };

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    title: 'The cabin in the woods',
    prompt:
      "Imagine you're spending a winter weekend in an isolated cabin. Snow is falling outside, a fire is burning in the fireplace, and an entire library is waiting for you. You have no obligations or distractions. What book would you choose?",
    options: [
      { id: 'a', text: 'A clever mystery, full of secrets, clues and details to piece together.', v: [0, 0, 10, 20] },
      { id: 'b', text: 'Something that will teach me something new or challenge the way I see the world.', v: [0, 0, 20, 5] },
      { id: 'c', text: 'A story that will transport me somewhere else, with fascinating characters and a world I can lose myself in.', v: [5, 20, 0, 0] },
      { id: 'd', text: "Something completely different from my usual reading: an unusual premise, a new genre or an author I've never tried.", v: [20, 0, 5, 5] },
    ],
  },
  {
    id: 'q2',
    title: 'A world beyond reality',
    prompt: "You've had an exhausting week and finally have an evening to yourself. What kind of reading experience are you looking for?",
    options: [
      { id: 'a', text: 'A world I can become emotionally attached to, with characters I genuinely care about.', v: [0, 20, 0, 0] },
      { id: 'b', text: 'A story that grabs me and keeps me guessing, with twists and layers to unravel.', v: [5, 0, 5, 20] },
      { id: 'c', text: 'Something outside my usual reading habits. Perhaps a genre or subject I rarely explore. I want to discover something different.', v: [15, 5, 0, 0] },
      { id: 'd', text: 'Something that makes me think, offers a new perspective or introduces me to different ideas.', v: [0, 0, 20, 5] },
    ],
  },
  {
    id: 'q3',
    title: 'An unexpected discovery',
    prompt: "You're halfway through a fantasy series when a friend recommends a fantastic thriller. It's completely different from what you're reading, and suddenly you're curious. What do you do?",
    options: [
      { id: 'a', text: 'I choose whichever book has the most interesting ideas or subject.', v: [5, 0, 20, 5] },
      { id: 'b', text: 'I finish the series first. I want to understand the complete story and see how everything fits together.', v: [0, 5, 5, 15] },
      { id: 'c', text: 'I put the series aside. I love variety and discovering new things.', v: [20, 0, 0, 5] },
      { id: 'd', text: "I stay with the series. I'm invested in the characters and that world, and I need to know what happens next.", v: [0, 20, 0, 0] },
    ],
  },
  {
    id: 'q4',
    title: 'The mysterious manuscript',
    prompt: "You find an ancient manuscript in an abandoned room. Its pages are filled with strange symbols, forgotten events and references to a civilisation you've never heard of. What catches your attention?",
    options: [
      { id: 'a', text: 'The historical knowledge it might contain and what it could teach me about the past.', v: [0, 0, 20, 5] },
      { id: 'b', text: 'The people and world described in its pages. I want to know their stories.', v: [5, 20, 0, 0] },
      { id: 'c', text: 'The symbols and inconsistencies. I want to identify patterns and discover what the manuscript is hiding.', v: [0, 0, 10, 20] },
      { id: 'd', text: 'The possibility of discovering something completely unknown. I want to explore and see where it takes me.', v: [20, 0, 5, 5] },
    ],
  },
  {
    id: 'q5',
    title: 'The final chapter',
    prompt: "You've just finished a book that completely captivated you. You close it, lean back and spend a moment thinking. What happens next?",
    options: [
      { id: 'a', text: "I'm already looking for my next read. There are so many stories waiting to be discovered.", v: [20, 5, 0, 0] },
      { id: 'b', text: 'I start thinking about the details. Did I miss a clue? Did earlier scenes mean something else?', v: [0, 0, 5, 20] },
      { id: 'c', text: 'I feel a little empty. I already miss the characters and wish I could stay in that world.', v: [0, 20, 0, 0] },
      { id: 'd', text: "I think about what I've learned, the ideas the book presented and whether it changed my perspective.", v: [0, 0, 20, 5] },
    ],
  },
  {
    id: 'q6',
    title: 'The annotated pages',
    prompt: 'You borrow a book from a friend and discover that almost every page is covered in their notes, highlights and annotations. How do you react?',
    options: [
      { id: 'a', text: "I'd rather experience the book with fresh eyes, without someone else's interpretations influencing my experience.", v: [0, 20, 0, 0] },
      { id: 'b', text: 'Their notes might introduce me to interesting information or ideas worth exploring.', v: [0, 0, 20, 10] },
      { id: 'c', text: 'I want to compare their theories with mine and perhaps add a few thoughts of my own.', v: [10, 0, 10, 20] },
      { id: 'd', text: 'I like seeing which passages and emotional moments meant something to them.', v: [10, 10, 5, 5] },
    ],
  },
  {
    id: 'q7',
    title: 'The ancient library',
    prompt: 'You discover a forgotten library, untouched for centuries, filled with books and records of vanished civilisations. You have an entire day to explore it. Where do you spend your time?',
    options: [
      { id: 'a', text: 'Investigating manuscripts, marginal notes and cross-references to uncover hidden connections.', v: [0, 0, 10, 20] },
      { id: 'b', text: 'Exploring stories about the people, places and civilisations that once existed. I want to know their worlds.', v: [5, 15, 10, 0] },
      { id: 'c', text: 'Browsing forgotten collections and discovering unusual books I might never have found otherwise.', v: [20, 0, 5, 5] },
      { id: 'd', text: 'Looking for historical, scientific and philosophical works. Imagine how much knowledge has been preserved here!', v: [0, 0, 20, 5] },
    ],
  },
  {
    id: 'q8',
    title: "The book that isn't working",
    prompt: "You're halfway through a book. You've read 150 pages, but it isn't meeting your expectations. The story is slow, you haven't connected with the characters, or you're simply not enjoying it. What do you do?",
    options: [
      { id: 'a', text: "I put it down. There are too many other books waiting for me to keep spending time on one that isn't working.", v: [20, 0, 0, 5] },
      { id: 'b', text: 'I keep reading. There may be something valuable to learn or an important perspective further ahead.', v: [0, 0, 20, 0] },
      { id: 'c', text: "I keep reading if I suspect I'm missing something. Perhaps the details will connect or the ending will explain everything.", v: [0, 0, 5, 20] },
      { id: 'd', text: "I give it a little more time. Sometimes a story takes a while to develop, and I'm not ready to abandon that world.", v: [0, 15, 5, 0] },
    ],
  },
  {
    id: 'q9',
    title: "The author's invitation",
    prompt: 'Your favourite author invites you to dinner. You have the opportunity to ask them questions about their work. What would you most like to discuss?',
    options: [
      { id: 'a', text: 'About the characters: where they came from, what inspired their relationships and what happens to them after the final chapter.', v: [0, 20, 0, 5] },
      { id: 'b', text: "About their next project: what new story, world or genre they're excited to explore.", v: [20, 5, 0, 0] },
      { id: 'c', text: "About their ideas and inspirations: what they've learned through writing and what subjects they wish more people understood.", v: [0, 0, 20, 5] },
      { id: 'd', text: 'About their writing process: how they construct plots, plant clues and connect seemingly unrelated details.', v: [0, 0, 10, 20] },
    ],
  },
  {
    id: 'q10',
    title: 'The unfinished saga',
    prompt: "You've just finished the second book in a five-book series. The next one won't be published for another year. What do you do in the meantime?",
    options: [
      { id: 'a', text: 'I research the historical, cultural or philosophical inspirations behind the series.', v: [0, 0, 20, 5] },
      { id: 'b', text: 'I explore other genres and authors. There are so many other stories to discover while I wait.', v: [20, 0, 0, 5] },
      { id: 'c', text: "I reread my favourite scenes, return to the books and perhaps explore fan discussions. I'm not ready to leave that world.", v: [0, 20, 0, 5] },
      { id: 'd', text: "I revisit the books looking for foreshadowing, hidden references and details that might reveal what's coming.", v: [0, 0, 5, 20] },
    ],
  },
  {
    id: 'q11',
    title: 'The puzzle within the pages',
    prompt: 'As you read, you notice that several seemingly insignificant details may be connected. Perhaps the author has planted clues that will only make sense later. What happens next?',
    options: [
      { id: 'a', text: 'I keep reading and enjoy the suspense. I like being surprised and discovering where the story takes me.', v: [15, 10, 0, 0] },
      { id: 'b', text: "I become even more invested in the characters and in how these discoveries will affect the world I've grown attached to.", v: [0, 20, 0, 5] },
      { id: 'c', text: 'I think about what the mystery might represent and the deeper question the author may be exploring.', v: [0, 0, 20, 10] },
      { id: 'd', text: "I go back, take notes and start building a theory. I need to know whether I'm on the right track.", v: [0, 0, 5, 20] },
    ],
  },
  {
    id: 'q12',
    title: 'The book that changes everything',
    prompt: 'Imagine looking back on a lifetime of reading: thousands of pages, countless stories and experiences. What do you value most about the role books have played in your life?',
    options: [
      { id: 'a', text: 'The unexpected discoveries, adventures and experiences I might never have found otherwise.', v: [20, 0, 5, 0] },
      { id: 'b', text: "The knowledge, wisdom and understanding I've gained. I've grown with every book.", v: [0, 0, 20, 5] },
      { id: 'c', text: 'Learning to look beyond the obvious, question things and recognise meanings others might not see.', v: [0, 0, 5, 20] },
      { id: 'd', text: "The characters I've loved, the worlds I've visited and the stories that have become part of me.", v: [0, 20, 0, 0] },
    ],
  },
];

/** House order of every vector. */
export const VECTOR_ORDER = ['wanderers', 'weavers', 'luminaries', 'seekers'] as const;
export type QuizHouse = (typeof VECTOR_ORDER)[number];

export type TieBreaker = { id: string; title: string; prompt: string; options: { id: 'a' | 'b'; text: string; house: QuizHouse }[] };

/** One tie-breaker per pair of Houses; each answer gives +20 to its House only. Keyed "houseA|houseB" in VECTOR_ORDER. */
export const TIE_BREAKERS: Record<string, TieBreaker> = {
  'wanderers|weavers': {
    id: 'tb1',
    title: 'The unfinished journey',
    prompt: "Imagine you could spend a week inside a book you've already read. You can return to a world you love or discover a completely new one. Which would you choose?",
    options: [
      { id: 'a', text: 'Return to a world I love. I want to spend time with those characters again and feel it all once more.', house: 'weavers' },
      { id: 'b', text: "Discover a completely new place. There's something exciting about experiencing a story I've never encountered before.", house: 'wanderers' },
    ],
  },
  'wanderers|luminaries': {
    id: 'tb2',
    title: 'The two doors',
    prompt: 'You enter a room with two doors. Behind one is a completely unknown world full of unexpected experiences. Behind the other is a library of knowledge that could change how you understand the world. You can choose only one.',
    options: [
      { id: 'a', text: 'The unknown world. I want to explore, discover and see what awaits me.', house: 'wanderers' },
      { id: 'b', text: "The library. I want to learn, understand and leave with knowledge I don't have yet.", house: 'luminaries' },
    ],
  },
  'wanderers|seekers': {
    id: 'tb3',
    title: 'The secret passage',
    prompt: "While reading an old fantasy book, you discover a secret passage said to lead to an extraordinary place. You know nothing about what's on the other side.",
    options: [
      { id: 'a', text: "I go in immediately. I don't need to know what awaits me on the other side.", house: 'wanderers' },
      { id: 'b', text: 'I investigate first. I want to understand why the passage exists, where it leads and what the clues reveal.', house: 'seekers' },
    ],
  },
  'weavers|luminaries': {
    id: 'tb4',
    title: "The book you'd keep forever",
    prompt: 'You can keep only one book from your entire collection. Which would you choose?',
    options: [
      { id: 'a', text: 'The book that made me feel everything. Its characters, world and story will always hold a special place in my heart.', house: 'weavers' },
      { id: 'b', text: 'The book that changed how I see the world. Its ideas and lessons have stayed with me long after I finished it.', house: 'luminaries' },
    ],
  },
  'weavers|seekers': {
    id: 'tb5',
    title: 'The world behind the story',
    prompt: "You're offered the chance to spend a week inside your favourite fictional universe. You can live alongside its characters or uncover the secrets hidden in that world's history and mythology.",
    options: [
      { id: 'a', text: 'Live in that world. I want to experience everyday life there, meet the characters and become part of it.', house: 'weavers' },
      { id: 'b', text: 'Uncover its secrets. I want to investigate its history, understand its mysteries and discover what lies beneath the surface.', house: 'seekers' },
    ],
  },
  'luminaries|seekers': {
    id: 'tb6',
    title: 'The unanswered question',
    prompt: 'You discover a fascinating mystery connected to an ancient civilisation and can spend a month investigating it. What would you most want to achieve?',
    options: [
      { id: 'a', text: 'Understand the civilisation itself: its history, beliefs, discoveries and the knowledge it left behind.', house: 'luminaries' },
      { id: 'b', text: 'Solve the mystery: investigate the evidence, connect the clues and reconstruct what really happened.', house: 'seekers' },
    ],
  },
};

export const TIE_BREAK_POINTS = 20;

/** The tie-breaker for exactly two tied Houses (order-insensitive). */
export function tieBreakerFor(a: QuizHouse, b: QuizHouse): TieBreaker {
  const [x, y] = [a, b].sort((p, q) => VECTOR_ORDER.indexOf(p) - VECTOR_ORDER.indexOf(q));
  return TIE_BREAKERS[`${x}|${y}`];
}

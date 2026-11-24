/** Phrases readers can pin on a review. Keys match private.valid_review_tags in the database. */
export const REVIEW_TAGS = [
  { key: 'brain-chemistry', label: 'Changed my brain chemistry' },
  { key: 'book-boyfriend', label: 'Unparalleled book boyfriend' },
  { key: 'enemies-to-lovers', label: 'Enemies to lovers', trope: true },
  { key: 'forced-proximity', label: 'Forced proximity', trope: true },
  { key: 'slow-burn', label: 'Slow burn', trope: true },
  { key: 'love-triangle', label: 'Love triangle', trope: true },
  { key: 'found-family', label: 'Found family', trope: true },
  { key: 'morally-grey', label: 'Morally grey', trope: true },
  { key: 'grumpy-sunshine', label: 'Grumpy x sunshine', trope: true },
  { key: 'fake-dating', label: 'Fake dating', trope: true },
  { key: 'second-chance', label: 'Second chance', trope: true },
  { key: 'chosen-one', label: 'Chosen one', trope: true },
  { key: 'plot-twist', label: 'Did not see that twist coming' },
  { key: 'cried', label: 'Made me cry' },
  { key: 'unputdownable', label: 'Could not put it down' },
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number]['key'];
export const MAX_REVIEW_TAGS = 8;
export const TROPES = REVIEW_TAGS.filter((t) => 'trope' in t && t.trope);
export const tagLabel = (key: string) => REVIEW_TAGS.find((t) => t.key === key)?.label ?? key;

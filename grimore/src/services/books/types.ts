/** Provider-neutral book record. Every external source maps into this shape. */
export type ExternalBook = {
  source: 'open_library' | 'google_books';
  sourceId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  firstPublishedYear?: number;
  pageCount?: number;
  coverUrl?: string;
  isbn13?: string;
  isbn10?: string;
  openLibraryWorkKey?: string;
  googleVolumeId?: string;
  publisher?: string;
  publishedDate?: string;
  language?: string;
  description?: string;
};

export interface BookProvider {
  readonly id: ExternalBook['source'];
  search(query: string, signal?: AbortSignal): Promise<ExternalBook[]>;
  byIsbn(isbn: string, signal?: AbortSignal): Promise<ExternalBook | null>;
}

import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BookCover, Divider, EmptyState, Icon, Skeleton, Text, TextField } from '@/components/ui';
import { useDebounced } from '@/hooks/use-debounced';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { importBook, searchExternal, type ExternalBook } from '@/services/books';
import { searchCatalogue, type BookSummary } from '@/services/catalogue';
import { spacing, useTheme } from '@/theme';

type Props = {
  onSelect: (book: BookSummary) => void | Promise<void>;
  /** Also search Open Library / Google Books (off for games: catalogue only). */
  includeExternal?: boolean;
  placeholder?: string;
  excludeIds?: string[];
  autoFocus?: boolean;
  renderTrailing?: (book: BookSummary) => ReactNode;
  emptyHint?: ReactNode;
};

/**
 * Search the GriMore catalogue first; optionally fall back to external
 * providers. Selecting an external result imports it (deduplicated
 * server-side) before handing a catalogue id back.
 */
export function BookSearch({ onSelect, includeExternal = true, placeholder = 'Title, author or ISBN', excludeIds = [], autoFocus, renderTrailing, emptyHint }: Props) {
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(query.trim(), 300);
  const exclude = new Set(excludeIds);

  const local = useQuery({ queryKey: qk.catalogueSearch(q), queryFn: () => searchCatalogue(q, 12), enabled: q.length >= 2 });
  const external = useQuery({
    queryKey: qk.externalSearch(q),
    queryFn: ({ signal }) => searchExternal(q, signal),
    enabled: includeExternal && q.length >= 3,
    staleTime: 5 * 60_000,
  });

  const localResults = (local.data ?? []).filter((b) => !exclude.has(b.id));
  const localKeys = new Set(localResults.map((b) => `${b.title.toLowerCase()}|${b.authors.split(',')[0]?.toLowerCase().trim()}`));
  const externalResults = (external.data ?? []).filter(
    (b) => !localKeys.has(`${b.title.toLowerCase()}|${(b.authors[0] ?? '').toLowerCase()}`),
  );

  const chooseExternal = async (b: ExternalBook) => {
    setError(null);
    setImporting(b.sourceId);
    try {
      const id = await importBook(b);
      await onSelect({ id, title: b.title, cover_url: b.coverUrl ?? null, first_published_year: b.firstPublishedYear ?? null, authors: b.authors.join(', ') });
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setImporting(null);
    }
  };

  const nothing = q.length >= 2 && !local.isFetching && !external.isFetching && localResults.length === 0 && externalResults.length === 0;

  return (
    <View style={{ gap: spacing.base }}>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        leadingIcon="search"
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search books"
        clearButtonMode="while-editing"
      />
      {error ? <Text variant="caption" tone="danger">{error}</Text> : null}

      {q.length < 2 ? emptyHint ?? null : null}

      {local.isLoading && q.length >= 2 ? <ResultSkeleton /> : null}

      {localResults.map((b) => (
        <ResultRow key={b.id} title={b.title} subtitle={subtitleFor(b.authors, b.first_published_year)} cover={b.cover_url} onPress={() => onSelect(b)} trailing={renderTrailing?.(b)} />
      ))}

      {includeExternal && externalResults.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Divider spacingY={spacing.xs} />
          <Text variant="eyebrow">More editions and titles</Text>
          {externalResults.slice(0, 15).map((b) => (
            <ResultRow
              key={`${b.source}:${b.sourceId}`}
              title={b.title}
              subtitle={subtitleFor(b.authors.join(', '), b.firstPublishedYear ?? null)}
              cover={b.coverUrl}
              onPress={() => void chooseExternal(b)}
              busy={importing === b.sourceId}
              source={b.source === 'open_library' ? 'Open Library' : 'Google Books'}
            />
          ))}
        </View>
      ) : null}

      {includeExternal && external.isFetching && q.length >= 3 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm }}>
          <ActivityIndicator size="small" />
          <Text variant="caption">Searching libraries worldwide…</Text>
        </View>
      ) : null}

      {nothing ? <EmptyState compact icon="book" title="No books found" body="Try the original title, the author’s surname, or the ISBN on the back cover." /> : null}
    </View>
  );
}

function subtitleFor(authors: string, year: number | null) {
  return [authors || 'Unknown author', year ? String(year) : null].filter(Boolean).join(' · ');
}

function ResultRow({
  title,
  subtitle,
  cover,
  onPress,
  busy,
  source,
  trailing,
}: {
  title: string;
  subtitle: string;
  cover?: string | null;
  onPress: () => void;
  busy?: boolean;
  source?: string;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs, opacity: pressed ? 0.7 : 1 })}
    >
      <BookCover title={title} uri={cover} size="xs" accessible={false} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bookTitle" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {subtitle}
        </Text>
        {source ? (
          <Text variant="caption" tone="subtle" style={{ fontSize: 11 }}>
            via {source}
          </Text>
        ) : null}
      </View>
      {busy ? <ActivityIndicator color={colors.accent} /> : trailing ?? <Icon name="plus" size={18} tone="accent" />}
    </Pressable>
  );
}

function ResultSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Skeleton width={40} height={60} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

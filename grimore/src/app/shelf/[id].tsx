import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { openBook } from '@/components/books';
import { Btn, Cover, EmptyState, Press, Screen, SectionHead, Stagger, Text, toast } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { importBook, type ExternalBook } from '@/services/books';
import { booksByGenreId, GENRE_SUBJECTS, worldGenreBooks } from '@/services/discover';
import { getShelfBooks, listByStatus, type ReadingStatus } from '@/services/library';
import { fonts, spacing } from '@/theme';

/** id is "genre:<id>", "<userId>:<status|owned>" or a custom shelf id. */
async function load(id: string) {
  if (id.startsWith('genre:')) return (await booksByGenreId(Number(id.slice(6)))).map((b) => ({ id: b.id, title: b.title, cover_url: b.cover_url, authors: b.authors }));
  if (id.includes(':')) {
    const [user, status] = id.split(':');
    return (await listByStatus(user, status as ReadingStatus | 'owned', 500)).map((e) => ({ id: e.book.id, title: e.book.title, cover_url: e.book.cover_url, authors: e.book.authors }));
  }
  return getShelfBooks(id);
}

export default function ShelfScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const q = useQuery({ queryKey: ['shelf', id], queryFn: () => load(id) });
  const genreId = id.startsWith('genre:') ? Number(id.slice(6)) : null;
  const slug = useQuery({ queryKey: ['genre-slug', genreId], queryFn: () => genreSlug(genreId!), enabled: genreId != null, staleTime: Infinity });
  const world = useInfiniteQuery({
    queryKey: ['world-genre', slug.data],
    enabled: !!slug.data && !!GENRE_SUBJECTS[slug.data],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => worldGenreBooks(slug.data!, pageParam, signal),
    getNextPageParam: (last, all) => (last.books.length && all.length * 30 < last.total && all.length < 30 ? all.length + 1 : undefined),
    staleTime: 60 * 60_000,
  });
  const books = q.data ?? [];
  const seen = new Set(books.map((b) => b.title.toLowerCase()));
  const more = (world.data?.pages ?? [])
    .flatMap((p) => p.books)
    .filter((b) => {
      const k = b.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const total = world.data?.pages[0]?.total;
  const openExternal = async (b: ExternalBook) => {
    try {
      openBook(await importBook(b));
    } catch (e) {
      toast(toAppError(e).message);
    }
  };
  return (
    <Screen title={name ?? 'Shelf'} back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      {!q.isLoading && books.length === 0 && genreId == null ? <EmptyState title="Nothing on this shelf yet" /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, columnGap: spacing.md, rowGap: spacing.lg }}>
        {books.map((b, i) => (
          <Stagger key={b.id} i={i} style={{ width: '30.6%' }}>
            <Press onPress={() => openBook(b.id)}>
              <Cover uri={b.cover_url} title={b.title} author={b.authors} width={100} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
              <Text variant="caption" numberOfLines={1} style={{ fontFamily: fonts.medium, marginTop: 6 }}>
                {b.title}
              </Text>
            </Press>
          </Stagger>
        ))}
      </View>
      {genreId != null ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="From the world's library" />
          <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.sm, marginBottom: spacing.md }}>
            {total ? `${total.toLocaleString('en-IE')} books on Open Library, most read first.` : 'Popular books from Open Library.'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, columnGap: spacing.md, rowGap: spacing.lg }}>
            {more.map((b) => (
              <Press key={b.sourceId} accessibilityLabel={b.title} onPress={() => void openExternal(b)} style={{ width: '30.6%' }}>
                <Cover uri={b.coverUrl ?? null} title={b.title} author={b.authors[0]} width={100} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
                <Text variant="caption" numberOfLines={1} style={{ fontFamily: fonts.medium, marginTop: 6 }}>
                  {b.title}
                </Text>
                <Text variant="micro" tone="muted" numberOfLines={1} style={{ fontFamily: fonts.regular }}>
                  {b.authors[0] ?? ''}
                </Text>
              </Press>
            ))}
          </View>
          {world.isError ? (
            <Text variant="small" tone="muted" align="center" style={{ marginTop: spacing.lg }}>
              Could not reach Open Library. Pull to refresh.
            </Text>
          ) : null}
          {world.hasNextPage || world.isFetching ? (
            <Btn variant="secondary" loading={world.isFetching} onPress={() => void world.fetchNextPage()} style={{ alignSelf: 'center', marginTop: spacing.xl }}>
              Show more
            </Btn>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

async function genreSlug(id: number) {
  const { data } = await supabase.from('genres').select('slug').eq('id', id).maybeSingle();
  return data?.slug ?? null;
}

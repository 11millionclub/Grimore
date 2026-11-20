import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { openBook } from '@/components/books';
import { Cover, EmptyState, Press, Screen, Stagger, Text } from '@/components/ui';
import { booksByGenreId } from '@/services/discover';
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
  const books = q.data ?? [];
  return (
    <Screen title={name ?? 'Shelf'} back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      {!q.isLoading && books.length === 0 ? <EmptyState title="Nothing on this shelf yet" /> : null}
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
    </Screen>
  );
}

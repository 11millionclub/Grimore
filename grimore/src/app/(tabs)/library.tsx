import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShelfPlank } from '@/components/ornaments';

import { BookCover, Chip, ChipRow, EmptyState, ErrorState, Icon, IconButton, ProgressBar, Rating, Skeleton, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { qk } from '@/lib/query-client';
import { STATUS_META, STATUS_ORDER, getStatusCounts, listLibrary, type LibraryEntry, type LibrarySort, type ReadingStatus } from '@/services/library';
import { layout, spacing, useTheme } from '@/theme';

const SORTS: { value: LibrarySort; label: string }[] = [
  { value: 'updated', label: 'Recent activity' },
  { value: 'added', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Your rating' },
];

export default function Library() {
  const userId = useMyId()!;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ status?: ReadingStatus }>();

  const [status, setStatus] = useState<ReadingStatus | 'all'>(params.status ?? 'all');
  const [sort, setSort] = useState<LibrarySort>('updated');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim(), 250);

  const contentWidth = Math.min(width, layout.maxContentWidth) - layout.screenPadding * 2;
  const columns = Math.max(3, Math.floor(contentWidth / 118));
  const gap = spacing.base;
  const coverWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const counts = useQuery({ queryKey: [...qk.libraryAll, 'counts'], queryFn: () => getStatusCounts(userId) });
  const list = useInfiniteQuery({
    queryKey: qk.library(`${status}|${sort}|${term}`),
    queryFn: ({ pageParam }) => listLibrary({ userId, status, sort, search: term, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const header = (
    <View style={{ paddingTop: insets.top + spacing.base, gap: spacing.base, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="eyebrow">
            {counts.data ? `${counts.data.all} ${counts.data.all === 1 ? 'tome' : 'tomes'} · ${counts.data.want_to_read + counts.data.on_hold} unread` : 'Your collection'}
          </Text>
          <Text variant="display" accessibilityRole="header">
            The Library
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <IconButton icon={view === 'grid' ? 'list' : 'grid'} label={view === 'grid' ? 'Show as list' : 'Show as shelves'} onPress={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))} filled />
          <IconButton icon="plus" label="Add a book" onPress={() => router.push('/add-book')} filled tone="accent" />
        </View>
      </View>
      <TextField value={search} onChangeText={setSearch} placeholder="Search your library" leadingIcon="search" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      <ChipRow>
        <Chip label="All" count={counts.data?.all} selected={status === 'all'} onPress={() => setStatus('all')} />
        {STATUS_ORDER.map((s) => (
          <Chip key={s} label={STATUS_META[s].short} icon={STATUS_META[s].icon} count={counts.data?.[s]} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ChipRow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="sliders" size={14} tone="inkMuted" />
        <ChipRow>
          {SORTS.map((s) => (
            <Pressable key={s.value} accessibilityRole="button" accessibilityState={{ selected: sort === s.value }} onPress={() => setSort(s.value)} hitSlop={6}>
              <Text variant="caption" tone={sort === s.value ? 'ink' : 'subtle'} style={{ textDecorationLine: sort === s.value ? 'underline' : 'none' }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ChipRow>
      </View>
    </View>
  );

  const empty = list.isLoading ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <Skeleton key={i} width={coverWidth} height={coverWidth * 1.5} />
      ))}
    </View>
  ) : list.isError ? (
    <ErrorState onRetry={() => void list.refetch()} />
  ) : term ? (
    <EmptyState icon="search" title="No matches" body={`Nothing in your library matches “${term}”.`} actionLabel="Search all books" onAction={() => router.push('/add-book')} />
  ) : status !== 'all' ? (
    <EmptyState icon={STATUS_META[status].icon} title={`No books in ${STATUS_META[status].label}`} body="Change a book’s status from its page and it will appear here." />
  ) : (
    <EmptyState icon="book" title="Your shelves are waiting" body="Add the books you are reading, have read, or dream of reading." actionLabel="Add your first book" onAction={() => router.push('/add-book')} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        key={`${view}-${columns}`}
        data={items}
        numColumns={view === 'grid' ? columns : 1}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        columnWrapperStyle={view === 'grid' ? { gap, alignItems: 'flex-end' } : undefined}
        ItemSeparatorComponent={view === 'grid' ? ShelfRow : undefined}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingBottom: layout.tabBarHeight + insets.bottom + spacing.xxxl,
          gap: view === 'grid' ? 0 : spacing.base,
          maxWidth: layout.maxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.5}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        ListFooterComponent={
          <>
            {view === 'grid' && items.length ? <ShelfRow /> : null}
            {list.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: spacing.lg }} /> : null}
          </>
        }
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => {
          void list.refetch();
          void counts.refetch();
        }}
        renderItem={({ item }) => (view === 'grid' ? <GridItem entry={item} width={coverWidth} /> : <ListItem entry={item} />)}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

/** A wooden plank under each row of covers. */
function ShelfRow() {
  return <ShelfPlank style={{ marginTop: 0, marginBottom: spacing.xl }} />;
}

function open(entry: LibraryEntry) {
  router.push({ pathname: '/book/[id]', params: { id: entry.book.id } });
}

function GridItem({ entry, width }: { entry: LibraryEntry; width: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.book.title}, ${STATUS_META[entry.status].label}${entry.rating ? `, rated ${entry.rating}` : ''}`}
      onPress={() => open(entry)}
      style={({ pressed }) => ({ width, transform: [{ translateY: pressed ? -6 : 0 }] })}
    >
      <View>
        <BookCover title={entry.book.title} author={entry.book.authors} uri={entry.book.cover_url} width={width} accessible={false} />
        {entry.status === 'reading' ? (
          <View style={{ position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm }}>
            <ProgressBar value={(entry.progress_percent ?? 0) / 100} height={3} />
          </View>
        ) : null}
        {entry.status !== 'read' && entry.status !== 'reading' ? (
          <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, opacity: 0.94 }}>
            <Text variant="caption" style={{ fontSize: 10 }}>
              {STATUS_META[entry.status].short}
            </Text>
          </View>
        ) : null}
      </View>
      {entry.rating ? (
        <View style={{ position: 'absolute', bottom: spacing.xs, left: spacing.xs, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, opacity: 0.94 }}>
          <Rating value={entry.rating} size={9} />
        </View>
      ) : null}
    </Pressable>
  );
}

function ListItem({ entry }: { entry: LibraryEntry }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => open(entry)} style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.base, opacity: pressed ? 0.75 : 1 })}>
      <BookCover title={entry.book.title} author={entry.book.authors} uri={entry.book.cover_url} size="sm" accessible={false} />
      <View style={{ flex: 1, gap: spacing.xs, justifyContent: 'center' }}>
        <Text variant="bookTitle" numberOfLines={2}>
          {entry.book.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {entry.book.authors}
          {entry.book.first_published_year ? ` · ${entry.book.first_published_year}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
          <Icon name={STATUS_META[entry.status].icon} size={12} tone="inkMuted" />
          <Text variant="caption">{STATUS_META[entry.status].label}</Text>
          {entry.rating ? <Rating value={entry.rating} size={11} /> : null}
        </View>
        {entry.status === 'reading' ? <ProgressBar value={(entry.progress_percent ?? 0) / 100} height={3} /> : null}
      </View>
    </Pressable>
  );
}

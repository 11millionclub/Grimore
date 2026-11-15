import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { FeedCard } from '@/components/feed-card';
import { TopBar } from '@/components/top-bar';
import {
  BookCover,
  Button,
  Chip,
  ChipGroup,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  InlineAlert,
  ProgressBar,
  Rating,
  Screen,
  SectionHeader,
  Skeleton,
  Stat,
  Text,
  TextField,
} from '@/components/ui';
import { countryName } from '@/features/games/presentation';
import { useFavoriteBooks, useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getBook, getBookCommunity } from '@/services/catalogue';
import { STATUS_META, STATUS_ORDER, getEntry, removeEntry, saveEntry, type EntryPatch } from '@/services/library';
import { addFavoriteBook, removeFavoriteBook } from '@/services/profile';
import { getFeed } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useMyId()!;
  const { colors, scheme } = useTheme();
  const queryClient = useQueryClient();

  const book = useQuery({ queryKey: qk.book(id), queryFn: () => getBook(id) });
  const entry = useQuery({ queryKey: qk.libraryEntry(id), queryFn: () => getEntry(userId, id) });
  const community = useQuery({ queryKey: [...qk.book(id), 'community'], queryFn: () => getBookCommunity(id) });
  const reviews = useQuery({ queryKey: qk.bookReviews(id), queryFn: () => getFeed({ viewerId: userId, scope: 'reviews', bookId: id }) });
  const favourites = useFavoriteBooks(userId);
  const isFavourite = !!favourites.data?.some((b) => b.id === id);

  // Drafts fall back to the saved values until the reader edits them.
  const [notesDraft, setNotes] = useState<string | null>(null);
  const [pageDraft, setPage] = useState<string | null>(null);
  const notes = notesDraft ?? entry.data?.notes ?? '';
  const page = pageDraft ?? (entry.data?.current_page ? String(entry.data.current_page) : '');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.libraryEntry(id) });
    void queryClient.invalidateQueries({ queryKey: qk.libraryAll });
    void queryClient.invalidateQueries({ queryKey: qk.stats(userId) });
    void queryClient.invalidateQueries({ queryKey: ['goal'] });
  };

  const save = useMutation({
    mutationFn: (patch: EntryPatch) => saveEntry(userId, id, patch),
    onMutate: () => setError(null),
    onSuccess: () => {
      setNotes(null);
      setPage(null);
      invalidate();
    },
    onError: (e) => setError(toAppError(e).message),
  });

  const remove = useMutation({
    mutationFn: () => removeEntry(userId, id),
    onSuccess: invalidate,
    onError: (e) => setError(toAppError(e).message),
  });

  const favourite = useMutation({
    mutationFn: () => (isFavourite ? removeFavoriteBook(userId, id) : addFavoriteBook(userId, id, favourites.data?.length ?? 0)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.favorites(userId) }),
    onError: (e) => setError(toAppError(e).message),
  });

  if (book.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <TopBar />
        <ErrorState onRetry={() => void book.refetch()} />
      </View>
    );
  }

  const b = book.data;
  const e = entry.data;
  const pages = b?.page_count_estimate ?? null;
  const author = b?.book_authors?.find((x) => x.position === 0)?.authors;
  const genres = [b?.primary_genre, ...(b?.book_genres ?? []).map((g) => g.genres)].filter(
    (g, i, arr): g is NonNullable<typeof g> => !!g && arr.findIndex((x) => x?.id === g.id) === i,
  );

  const saveProgress = () => {
    const n = Number.parseInt(page, 10);
    if (!Number.isFinite(n) || n < 0) return;
    const percent = pages ? Math.min(100, Math.round((n / pages) * 100)) : null;
    save.mutate({ current_page: n, progress_percent: percent, ...(percent === 100 ? { status: 'read' } : {}) });
  };

  const confirmRemove = () =>
    Alert.alert('Remove from library?', 'Your rating and notes for this book will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Soft blurred backdrop from the cover */}
      {b?.cover_url ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380, overflow: 'hidden' }} pointerEvents="none">
          <Image source={{ uri: b.cover_url }} style={{ width: '100%', height: '100%', opacity: scheme === 'dark' ? 0.25 : 0.35 }} blurRadius={40} contentFit="cover" />
          <LinearGradient colors={['transparent', colors.canvas]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 }} />
        </View>
      ) : null}

      <TopBar
        transparent
        right={<IconButton icon="heart" label={isFavourite ? 'Remove from favourites' : 'Add to favourites'} tone={isFavourite ? 'accent' : 'ink'} onPress={() => favourite.mutate()} />}
      />

      <Screen edgeTop={false} background="transparent">
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xxl }}>
          {b ? <BookCover title={b.title} author={b.authorsLine} uri={b.cover_url} size="xl" /> : <Skeleton width={180} height={270} />}
          <View style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 520 }}>
            {b ? (
              <>
                <Text variant="title1" align="center" accessibilityRole="header">
                  {b.title}
                </Text>
                {b.subtitle ? (
                  <Text variant="serifBody" tone="muted" align="center">
                    {b.subtitle}
                  </Text>
                ) : null}
                <Text variant="bodyStrong" tone="muted" align="center">
                  {b.authorsLine || 'Unknown author'}
                </Text>
                <Text variant="caption" align="center">
                  {[b.first_published_year, author?.nationality_code ? countryName(author.nationality_code) : null, pages ? `about ${pages} pages` : null]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </>
            ) : (
              <>
                <Skeleton width={220} height={28} />
                <Skeleton width={140} height={14} />
              </>
            )}
          </View>
          {genres.length ? (
            <ChipGroup>
              {genres.map((g) => (
                <Chip key={g.id} label={g.name} />
              ))}
            </ChipGroup>
          ) : null}
        </View>

        {error ? (
          <View style={{ marginBottom: spacing.base }}>
            <InlineAlert>{error}</InlineAlert>
          </View>
        ) : null}

        {/* My shelf */}
        <View style={{ gap: spacing.base, marginBottom: spacing.xxl }}>
          <SectionHeader eyebrow="Your shelf" title={e ? STATUS_META[e.status].label : 'Add to your library'} />
          <ChipGroup>
            {STATUS_ORDER.map((s) => (
              <Chip key={s} label={STATUS_META[s].short} icon={STATUS_META[s].icon} selected={e?.status === s} onPress={() => save.mutate({ status: s })} />
            ))}
          </ChipGroup>

          {e ? (
            <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
              <View style={{ gap: spacing.sm }}>
                <Text variant="eyebrow">Your rating</Text>
                <Rating value={e.rating} size={30} onChange={(r) => save.mutate({ rating: r })} />
              </View>

              {e.status === 'reading' ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="eyebrow">Progress</Text>
                  <ProgressBar value={(e.progress_percent ?? 0) / 100} height={6} />
                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                      <TextField value={page} onChangeText={(t) => setPage(t.replace(/\D/g, ''))} placeholder={pages ? `Page (of ~${pages})` : 'Current page'} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={saveProgress} />
                    </View>
                    <Button title="Update" variant="secondary" onPress={saveProgress} loading={save.isPending} />
                  </View>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <TextField label="Private notes" value={notes} onChangeText={setNotes} placeholder="Thoughts, favourite lines, where you read it…" multiline maxLength={10000} />
                {notes !== (e.notes ?? '') ? (
                  <Button title="Save notes" size="sm" variant="secondary" onPress={() => save.mutate({ notes: notes.trim() || null })} style={{ alignSelf: 'flex-start' }} />
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button title="Write a review" icon="edit-3" onPress={() => router.push({ pathname: '/review/[bookId]', params: { bookId: id } })} />
                <Button title="Recommend" icon="gift" variant="secondary" onPress={() => router.push({ pathname: '/compose', params: { bookId: id, kind: 'recommendation' } })} />
              </View>
              <Pressable accessibilityRole="button" onPress={confirmRemove} style={{ alignSelf: 'flex-start' }} hitSlop={8}>
                <Text variant="caption" tone="danger">
                  Remove from library
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* About */}
        {b?.description ? (
          <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
            <Text variant="eyebrow">About the book</Text>
            <Text variant="serifBody" numberOfLines={expanded ? undefined : 6}>
              {b.description.replace(/<[^>]+>/g, '')}
            </Text>
            <Pressable onPress={() => setExpanded((x) => !x)} accessibilityRole="button" hitSlop={8}>
              <Text variant="callout" tone="accent">
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Community */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: spacing.xxl }}>
          <Stat align="center" value={community.data?.readers ?? '–'} label="readers" />
          <Stat align="center" value={community.data?.average ? community.data.average.toFixed(1) : '–'} label="avg rating" />
          <Stat align="center" value={community.data?.reviewCount ?? '–'} label="reviews" />
        </View>

        <SectionHeader eyebrow="Community" title="Reviews" actionLabel={e ? 'Write' : undefined} onAction={() => router.push({ pathname: '/review/[bookId]', params: { bookId: id } })} />
        {reviews.data?.items.length ? (
          reviews.data.items.map((item) => <FeedCard key={item.id} item={item} />)
        ) : reviews.isLoading ? (
          <Skeleton height={120} />
        ) : (
          <EmptyState compact icon="feather" title="No reviews yet" body="Be the first to tell other readers what this book meant to you." />
        )}

        {b?.book_editions?.length ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.xxl }}>
            <Text variant="eyebrow">Editions in GriMore</Text>
            {b.book_editions.map((ed, i) => (
              <View key={ed.id} style={{ gap: spacing.xs }}>
                {i > 0 ? <Divider spacingY={spacing.xs} /> : null}
                <Text variant="callout">{[ed.publisher, ed.published_date, ed.page_count ? `${ed.page_count} pages` : null].filter(Boolean).join(' · ') || 'Edition'}</Text>
                <Text variant="caption">{ed.book_identifiers.map((x) => `${x.type.replace('_', '-').toUpperCase()} ${x.value}`).join('   ')}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {b?.cover_source === 'open_library' ? (
          <Text variant="caption" tone="subtle" style={{ marginTop: spacing.xxl, borderRadius: radius.sm }}>
            Cover courtesy of Open Library.
          </Text>
        ) : null}
      </Screen>
    </View>
  );
}

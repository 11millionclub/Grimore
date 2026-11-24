import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityCover, openCommunity } from '@/components/books';
import { ReadingTimeCard } from '@/components/reading-time';
import { tagLabel } from '@/utils/review-tags';
import { ShelfPicker } from '@/components/shelf-picker';
import { BookOpenTextIcon, BookmarkSimpleIcon, CaretDownIcon, CaretRightIcon, StackIcon, CheckIcon, PencilSimpleLineIcon, ShareNetworkIcon, StarIcon, PepperIcon } from '@/components/icons';
import { Avatar, Btn, Cover, ErrorState, IconBtn, Press, Progress, Screen, SectionHead, Skeleton, Stars, Text, toast, shareText } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { friendsWithBook, getBook } from '@/services/catalogue';
import { communitiesForBook } from '@/services/communities';
import { addToShelf, getEntry, removeEntry, removeFromShelf, saveEntry, statusPatch, STATUS_META, type EntryPatch } from '@/services/library';
import { money } from '@/utils/money';
import { getBookReviews, getBookTags } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { MAX_SPICE, SPICE_LABELS, SPICE_STEPS, STAR_STEPS } from '@/utils/ratings';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['book', id], queryFn: () => getBook(id) });
  const entry = useQuery({ queryKey: ['library', 'entry', id], queryFn: () => getEntry(me, id) });
  const reviews = useQuery({ queryKey: ['book', id, 'reviews'], queryFn: () => getBookReviews(id, me) });
  const friends = useQuery({ queryKey: ['book', id, 'friends'], queryFn: () => friendsWithBook(me, id) });
  const tags = useQuery({ queryKey: ['book', id, 'tags'], queryFn: () => getBookTags(id) });
  const comms = useQuery({ queryKey: ['book', id, 'communities'], queryFn: () => communitiesForBook(id) });
  const [picking, setPicking] = useState(false);

  const save = useMutation({
    mutationFn: async ({ patch }: { patch: EntryPatch | null; done?: string }) => {
      if (patch) await saveEntry(me, id, patch);
      else await removeEntry(me, id);
    },
    onSuccess: (_d, { done }) => {
      void refreshLibrary(qc);
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
      void qc.invalidateQueries({ queryKey: ['streak'] });
      if (done) toast(done);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  if (book.isError) {
    const err = toAppError(book.error);
    return (
      <Screen title="Book" back>
        <ErrorState message={err.code === 'book_not_found' ? err.message : undefined} code={err.code} onRetry={() => book.refetch()} />
      </Screen>
    );
  }
  const b = book.data;
  const e = entry.data;
  const total = e?.book.page_count_estimate ?? b?.page_count_estimate ?? null;
  const reading = e?.status === 'reading';
  const want = e?.status === 'want_to_read';
  const myStars = e?.rating ?? 0;
  const mySpice = e?.spice ?? 0;
  const genres = [b?.primary_genre?.name, ...(b?.book_genres ?? []).map((g) => g.genres?.name)].filter((g, i, a): g is string => !!g && a.indexOf(g) === i);
  const myReview = reviews.data?.list.find((r) => r.author?.id === me);
  // Someone else's review first; your own when it is the only one (the count includes it).
  const topReview = reviews.data?.list.find((r) => r.author?.id !== me) ?? reviews.data?.list[0];

  const hero = (
    <View style={{ overflow: 'hidden', paddingTop: insets.top + 56 }}>
      {b?.cover_url ? <Image source={{ uri: b.cover_url }} blurRadius={40} style={{ position: 'absolute', inset: 0, opacity: 0.6, transform: [{ scale: 1.5 }] }} contentFit="cover" /> : null}
      <LinearGradient colors={['transparent', colors.bg + '66', colors.bg]} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ alignItems: 'center', paddingHorizontal: spacing.xxl, paddingBottom: spacing.xl }}>
        {b ? (
          <Animated.View entering={FadeInDown.springify().damping(14)}>
            <Cover uri={b.cover_url} title={b.title} author={b.authorsLine} width={150} />
          </Animated.View>
        ) : (
          <Skeleton width={150} height={225} rounded={4} />
        )}
        <Text accessibilityRole="header" align="center" style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 35, marginTop: spacing.xl }}>
          {b?.title ?? ' '}
        </Text>
        <Text variant="body" tone="muted" align="center" style={{ marginTop: 4 }}>
          {b?.authorsLine ? (
            <Text variant="body" style={{ fontFamily: fonts.medium, textDecorationLine: 'underline', textDecorationColor: colors.lineStrong }} onPress={() => router.push({ pathname: '/author/[name]', params: { name: b.authorsLine.split(',')[0] } })}>
              {b.authorsLine}
            </Text>
          ) : null}
          {b?.first_published_year ? ` · ${b.first_published_year}` : ''}
        </Text>
        {reviews.data?.avg ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
            <Stars value={reviews.data.avg} size={14} />
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {reviews.data.avg.toFixed(1)}
            </Text>
            <Text variant="small" tone="muted">
              {reviews.data.count} {reviews.data.count === 1 ? 'rating' : 'ratings'}
            </Text>
          </View>
        ) : null}
        {/* What readers say most about the book, right under its rating. */}
        {(tags.data ?? []).length ? (
          <View accessibilityLabel={`Readers say: ${(tags.data ?? []).slice(0, 4).map((t) => tagLabel(t.tag)).join(', ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: spacing.md }}>
            {(tags.data ?? []).slice(0, 4).map((t) => (
              <View key={t.tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text variant="caption" style={{ fontFamily: fonts.semibold }}>
                  {tagLabel(t.tag)}
                </Text>
                {t.n > 1 ? (
                  <Text variant="caption" tone="muted">
                    {t.n}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen
      title={b?.title}
      large={false}
      back
      hero={hero}
      barTransparent
      actions={
        <IconBtn label="Share" glass onPress={() => b && void shareText(`${b.title} by ${b.authorsLine}, on Grimore`)}>
          <ShareNetworkIcon size={20} color={colors.ink} />
        </IconBtn>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        {reading ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
                Reading
              </Text>
              <Text variant="small" tone="muted">
                {total ? `p. ${e?.current_page ?? 0} of ${total}` : `p. ${e?.current_page ?? 0}`}
              </Text>
            </View>
            <Progress value={total ? (e?.current_page ?? 0) / total : (e?.progress_percent ?? 0) / 100} />
            <Btn full style={{ marginTop: spacing.base }} onPress={() => router.push({ pathname: '/progress/[bookId]', params: { bookId: id } })}>
              Update page
            </Btn>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Btn
              style={{ flex: 1 }}
              loading={save.isPending}
              onPress={() => save.mutate({ patch: statusPatch('reading', e), done: `${b?.title ?? 'Book'} is back in Reading` })}
            >
              {e?.status === 'read' ? 'Read it again' : e?.status === 'dnf' || e?.status === 'on_hold' || (e?.current_page ?? 0) > 0 ? 'Continue reading' : 'Start reading'}
            </Btn>
            <Btn
              variant="secondary"
              accessibilityLabel={want ? 'Remove from Wishlist' : 'Add to Wishlist'}
              style={{ width: 48, paddingHorizontal: 0 }}
              onPress={() => save.mutate({ patch: want ? null : statusPatch('want_to_read', e), done: want ? 'Removed from Wishlist' : 'Added to Wishlist' })}
            >
              {want ? <CheckIcon size={18} weight="bold" color={colors.ink} /> : <BookmarkSimpleIcon size={18} color={colors.ink} />}
            </Btn>
          </View>
        )}

        <Press
          accessibilityRole="button"
          accessibilityLabel={e ? `Shelf: ${STATUS_META[e.status].label}. Change shelf` : 'Add to a shelf'}
          onPress={() => setPicking(true)}
          style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.base, minHeight: 52 }}
        >
          <StackIcon size={20} color={colors.accent} />
          <Text variant="callout" style={{ flex: 1, fontFamily: fonts.medium }}>
            {e ? 'Shelf' : 'Add to a shelf'}
          </Text>
          {e ? (
            <Text variant="callout" tone="accent" style={{ fontFamily: fonts.semibold }}>
              {STATUS_META[e.status].label}
            </Text>
          ) : null}
          <CaretDownIcon size={16} color={colors.muted} />
        </Press>
        {e && !reading ? (
          <Press
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/progress/[bookId]', params: { bookId: id } })}
            style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.base, minHeight: 52 }}
          >
            <BookOpenTextIcon size={20} color={colors.accent} />
            <Text variant="callout" style={{ flex: 1, fontFamily: fonts.medium }}>
              Log pages read
            </Text>
            <CaretRightIcon size={16} color={colors.muted} />
          </Press>
        ) : null}
        <ShelfPicker
          visible={picking}
          bookId={id}
          title={b?.title}
          current={e?.status ?? null}
          onClose={() => setPicking(false)}
          onRemove={() => save.mutate({ patch: null, done: 'Removed from your library' })}
          onPick={(choice) => {
            if (choice.kind === 'status') {
              if (choice.status !== e?.status) save.mutate({ patch: statusPatch(choice.status, e), done: `Moved to ${STATUS_META[choice.status].label}` });
            } else if (choice.remove)
              void removeFromShelf(choice.shelfId, id).then(
                () => {
                  void qc.invalidateQueries({ queryKey: ['shelves'] });
                  void qc.invalidateQueries({ queryKey: ['shelf', choice.shelfId] });
                  toast(`Removed from ${choice.title}`);
                },
                (err) => toast(toAppError(err).message),
              );
            else
              void addToShelf(choice.shelfId, id).then(
                () => {
                  if (!e) save.mutate({ patch: statusPatch('want_to_read') });
                  void qc.invalidateQueries({ queryKey: ['shelves'] });
                  toast(`Added to ${choice.title}`);
                },
                (err) => toast(toAppError(err).message),
              );
          }}
        />

        {want ? (
          <Press
            accessibilityRole="switch"
            accessibilityState={{ checked: !!e?.is_priority }}
            accessibilityLabel="Priority"
            onPress={() => save.mutate({ patch: { is_priority: !e?.is_priority }, done: e?.is_priority ? 'Removed from your priorities' : 'Marked as a priority' })}
            style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: e?.is_priority ? colors.goldSoft : colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: e?.is_priority ? colors.gold : colors.line, paddingHorizontal: spacing.base, minHeight: 52 }}
          >
            <StarIcon size={20} weight={e?.is_priority ? 'fill' : 'regular'} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" style={{ fontFamily: fonts.medium }}>
                {e?.is_priority ? 'Priority' : 'Make it a priority'}
              </Text>
              <Text variant="caption" tone="muted">
                Priority books stay at the top of your wishlist
              </Text>
            </View>
          </Press>
        ) : null}

        <View style={{ marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            <Text variant="callout" style={{ fontFamily: fonts.medium }}>
              Your rating
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {STAR_STEPS.map((i) => (
                <Press
                  key={i}
                  accessibilityLabel={`${i} stars`}
                  // Rating a book you have not finished files it under Read.
                  onPress={() => save.mutate({ patch: { rating: i, ...(e?.status === 'read' ? {} : statusPatch('read', e)) }, done: e?.status === 'read' ? undefined : 'Rated and moved to Finished' })}
                  style={{ padding: 3 }}
                >
                  <StarIcon size={22} weight="fill" color={i <= myStars ? colors.gold : colors.surface3} />
                </Press>
              ))}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            <View>
              <Text variant="callout" style={{ fontFamily: fonts.medium }}>
                Spice
              </Text>
              <Text variant="caption" tone="muted">
                {SPICE_LABELS[mySpice]}
                {reviews.data?.spiceAvg != null ? ` · readers say ${reviews.data.spiceAvg.toFixed(1)}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {SPICE_STEPS.map((i) => (
                <Press
                  key={i}
                  accessibilityLabel={`Spice ${i} of ${MAX_SPICE}`}
                  // Tapping the current level again clears it.
                  onPress={() => save.mutate({ patch: { spice: mySpice === i ? 0 : i, ...(e ? {} : statusPatch('read')) } })}
                  style={{ padding: 3 }}
                >
                  <PepperIcon size={22} weight={i <= mySpice ? 'fill' : 'regular'} color={i <= mySpice ? colors.danger : colors.surface3} />
                </Press>
              ))}
            </View>
          </View>
        </View>
        {e?.status === 'read' ? <ReadingTimeCard entry={e} onSave={(patch) => save.mutate({ patch, done: 'Reading time saved' })} /> : null}
        <Press onPress={() => router.push({ pathname: '/review/[bookId]', params: { bookId: id } })} style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingVertical: spacing.xs }}>
          <PencilSimpleLineIcon size={16} color={colors.accent} />
          <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
            {myReview ? 'Edit your review' : 'Write a review'}
          </Text>
        </Press>

        <View style={{ marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(b?.moods ?? []).map((m) => (
            <View key={m} style={{ borderRadius: radius.full, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text variant="small">{m}</Text>
            </View>
          ))}
          {genres.slice(0, 2).map((g) => (
            <View key={g} style={{ borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text variant="small" tone="accent" style={{ fontFamily: fonts.medium }}>
                {g}
              </Text>
            </View>
          ))}
        </View>

        {b?.description ? (
          <Text variant="body" style={{ marginTop: spacing.base, opacity: 0.9 }} numberOfLines={10}>
            {b.description}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: spacing.base }}>
          <Stat value={total ? String(total) : '—'} label="pages" />
          <Stat value={total ? `${Math.max(1, Math.round(total / 42))} h` : '—'} label="at your pace" border />
          <Stat value={b?.first_published_year ? String(b.first_published_year) : '—'} label="published" border />
        </View>
      </View>

      {friends.data && friends.data.readers.length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="People you follow" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
            <View style={{ flexDirection: 'row' }}>
              {friends.data.readers.slice(0, 5).map((u, i) => (
                <View key={u.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 20, borderWidth: 2, borderColor: colors.bg }}>
                  <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={34} />
                </View>
              ))}
            </View>
            <Text variant="small" tone="muted" style={{ flex: 1 }}>
              <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                {friends.data.readers
                  .slice(0, 2)
                  .map((u) => (u.display_name ?? u.username).split(' ')[0])
                  .join(', ')}
              </Text>
              {friends.data.readers.length > 2 ? ` and ${friends.data.readers.length - 2} more have it.` : ' have it.'}
              {friends.data.avg ? (
                <>
                  {' '}Friends’ average:{' '}
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {friends.data.avg.toFixed(1)}
                  </Text>
                </>
              ) : null}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title="Reviews" action={reviews.data?.count ? (reviews.data.count === 1 ? 'See review' : `See all ${reviews.data.count}`) : undefined} onAction={() => router.push({ pathname: '/reviews/[bookId]', params: { bookId: id } })} />
        {topReview ? (
          <Press onPress={() => router.push({ pathname: '/reviews/[bookId]', params: { bookId: id } })} style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar uri={topReview.author?.avatar_url} name={topReview.author?.display_name} size={28} />
              <Text variant="callout" style={{ fontFamily: fonts.semibold, flex: 1 }} numberOfLines={1}>
                {topReview.author?.id === me ? 'Your review' : (topReview.author?.display_name ?? topReview.author?.username)}
              </Text>
              <Stars value={topReview.rating} size={12} />
            </View>
            <Text variant="callout" style={{ marginTop: spacing.sm }} numberOfLines={5}>
              {topReview.has_spoilers ? 'Contains spoilers. Open the reviews to read it.' : topReview.body ?? topReview.headline ?? ''}
            </Text>
          </Press>
        ) : (
          <Text variant="callout" tone="muted" style={{ paddingHorizontal: spacing.lg }}>
            No reviews yet. Be the first to say what you thought.
          </Text>
        )}
      </View>

      {(comms.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Communities discussing it" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {(comms.data ?? []).map((c) => (
              <Press key={c.id} onPress={() => openCommunity(c.id)} style={{ width: 230, backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
                <CommunityCover c={c} height={96} />
                <View style={{ padding: spacing.md }}>
                  <Text variant="callout" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {c.member_count} members · {c.price_cents ? `${money(c.price_cents)}/month` : 'Free'}
                  </Text>
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {e ? (
          <Press
            onPress={() => save.mutate({ patch: null, done: 'Removed from your library' })}
            style={{ alignSelf: 'center', padding: spacing.md }}
          >
            <Text variant="small" tone="faint">
              Remove from my library
            </Text>
          </Press>
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: border ? 1 : 0, borderLeftColor: colors.line }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

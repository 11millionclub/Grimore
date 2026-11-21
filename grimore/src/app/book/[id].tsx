import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityCover, openCommunity } from '@/components/books';
import { BellIcon, BookmarkSimpleIcon, CaretRightIcon, CheckIcon, PencilSimpleLineIcon, ShareNetworkIcon, StarIcon, StorefrontIcon } from '@/components/icons';
import { Avatar, Btn, Cover, ErrorState, IconBtn, Press, Progress, Screen, SectionHead, Skeleton, Stars, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { friendsWithBook, getBook } from '@/services/catalogue';
import { communitiesForBook } from '@/services/communities';
import { getEntry, removeEntry, saveEntry, type EntryPatch } from '@/services/library';
import { hasAlert, listingsForBook, money, setAlert } from '@/services/market';
import { getBookReviews } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

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
  const comms = useQuery({ queryKey: ['book', id, 'communities'], queryFn: () => communitiesForBook(id) });
  const listings = useQuery({ queryKey: ['book', id, 'listings'], queryFn: () => listingsForBook(id) });
  const alert = useQuery({ queryKey: ['alert', id], queryFn: () => hasAlert(me, id) });

  const save = useMutation({
    mutationFn: async (patch: EntryPatch | null) => {
      if (patch) await saveEntry(me, id, patch);
      else await removeEntry(me, id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library'] });
      void qc.invalidateQueries({ queryKey: ['readingStats'] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const toggleAlert = useMutation({
    mutationFn: (on: boolean) => setAlert(me, id, on),
    onSuccess: (_d, on) => {
      void qc.invalidateQueries({ queryKey: ['alert', id] });
      toast(on ? 'We will tell you when someone lists it' : 'Alert removed');
    },
  });

  if (book.isError) return <Screen title="Book" back><ErrorState onRetry={() => book.refetch()} /></Screen>;
  const b = book.data;
  const e = entry.data;
  const total = e?.book.page_count_estimate ?? b?.page_count_estimate ?? null;
  const reading = e?.status === 'reading';
  const want = e?.status === 'want_to_read';
  const myStars = e?.rating ?? 0;
  const genres = [b?.primary_genre?.name, ...(b?.book_genres ?? []).map((g) => g.genres?.name)].filter((g, i, a): g is string => !!g && a.indexOf(g) === i);
  const myReview = reviews.data?.list.find((r) => r.author?.id === me);
  const topReview = reviews.data?.list.find((r) => r.author?.id !== me);

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
        <Text accessibilityRole="header" align="center" style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, marginTop: spacing.xl }}>
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
        <IconBtn label="Share" glass onPress={() => b && void Share.share({ message: `${b.title} by ${b.authorsLine}, on Grimore` })}>
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
              onPress={() => {
                save.mutate({ status: 'reading', started_on: new Date().toISOString().slice(0, 10) });
                toast(`${b?.title ?? 'Book'} is now in Reading`);
              }}
            >
              {e?.status === 'read' ? 'Read it again' : 'Start reading'}
            </Btn>
            <Btn
              variant="secondary"
              accessibilityLabel={want ? 'Remove from Want to read' : 'Add to Want to read'}
              style={{ width: 48, paddingHorizontal: 0 }}
              onPress={() => {
                save.mutate(want ? null : { status: 'want_to_read' });
                toast(want ? 'Removed from Want to read' : 'Added to Want to read');
              }}
            >
              {want ? <CheckIcon size={18} weight="bold" color={colors.ink} /> : <BookmarkSimpleIcon size={18} color={colors.ink} />}
            </Btn>
          </View>
        )}

        <View style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
          <Text variant="callout" style={{ fontFamily: fonts.medium }}>
            Your rating
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Press key={i} accessibilityLabel={`${i} stars`} onPress={() => save.mutate({ rating: i, ...(e ? {} : { status: 'read' as const }) })} style={{ padding: 4 }}>
                <StarIcon size={24} weight="fill" color={i <= myStars ? colors.accent : colors.surface3} />
              </Press>
            ))}
          </View>
        </View>
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
        <SectionHead title="Reviews" action={reviews.data?.count ? `See ${reviews.data.count}` : undefined} onAction={() => router.push({ pathname: '/reviews/[bookId]', params: { bookId: id } })} />
        {topReview ? (
          <Press onPress={() => router.push({ pathname: '/reviews/[bookId]', params: { bookId: id } })} style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar uri={topReview.author?.avatar_url} name={topReview.author?.display_name} size={28} />
              <Text variant="callout" style={{ fontFamily: fonts.semibold, flex: 1 }} numberOfLines={1}>
                {topReview.author?.display_name ?? topReview.author?.username}
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
        <Press
          onPress={() => (listings.data?.[0] ? router.push({ pathname: '/listing/[id]', params: { id: listings.data[0].id } }) : router.push({ pathname: '/sell', params: { bookId: id } }))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <StorefrontIcon size={20} weight="bold" color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{listings.data?.length ? `${listings.data.length} ${listings.data.length === 1 ? 'copy' : 'copies'} on the Market` : 'Nobody is selling it'}</Text>
            <Text variant="small" tone="muted">
              {listings.data?.length
                ? listings.data[0].mode === 'trade'
                  ? 'Available to trade'
                  : `from ${money(listings.data[0].price_cents, listings.data[0].currency)}${listings.data[0].mode === 'both' ? ' or trade' : ''}`
                : 'Sell or trade your copy'}
            </Text>
          </View>
          <CaretRightIcon size={18} color={colors.muted} />
        </Press>
        {!listings.data?.length ? (
          <Btn variant="ghost" size="sm" icon={<BellIcon size={14} weight={alert.data ? 'fill' : 'regular'} color={colors.ink} />} onPress={() => toggleAlert.mutate(!alert.data)}>
            {alert.data ? 'Alert on: we will tell you' : 'Alert me when someone lists it'}
          </Btn>
        ) : null}
        {e ? (
          <Press
            onPress={() => {
              save.mutate(null);
              toast('Removed from your library');
            }}
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

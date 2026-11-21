import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ComponentType, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { CommunityCover, openBook, openCommunity } from '@/components/books';
import { Plank, ThemeFill, type CornerLook } from '@/components/corner';
import { Ring } from '@/components/feed';
import {
  BooksIcon,
  ChatTeardropTextIcon,
  FeatherIcon,
  FireIcon,
  LightningIcon,
  MedalIcon,
  MoonStarsIcon,
  MusicNotesIcon,
  QuotesIcon,
  StarIcon,
  TrophyIcon,
  UsersThreeIcon,
  type IconProps,
} from '@/components/icons';
import { Avatar, Cover, Press, Progress, SectionHead, Text, toast } from '@/components/ui';
import { useAchievements, useFavoriteBooks, useMyId, useReadingGoal, useReadingStats, useShelf, useStreak } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { myCommunities } from '@/services/communities';
import { listGuestbook, signGuestbook, type Widget } from '@/services/corner';
import { listQuotes } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { fmt, relativeTime } from '@/utils/dates';

const BADGE_ICON: Record<string, ComponentType<IconProps>> = {
  moon: MoonStarsIcon,
  lightning: LightningIcon,
  books: BooksIcon,
  star: StarIcon,
  feather: FeatherIcon,
  flame: FireIcon,
  hourglass: TrophyIcon,
  users: UsersThreeIcon,
};
export const badgeIcon = (name: string) => BADGE_ICON[name] ?? MedalIcon;

type Props = { userId: string; look: CornerLook; widgets: string[]; status?: string | null; song?: string | null; preview?: boolean };

export function CornerBlocks({ userId, look, widgets, status, song, preview }: Props) {
  const { colors } = useTheme();
  const me = useMyId();
  const isMe = me === userId;
  const favs = useFavoriteBooks(userId);
  const reading = useShelf(userId, 'reading');
  const want = useShelf(userId, 'want_to_read');
  const read = useShelf(userId, 'read');
  const goal = useReadingGoal(userId);
  const streak = useStreak(userId);
  const stats = useReadingStats(widgets.some((w) => ['year', 'genres', 'authors'].includes(w)) ? userId : undefined);
  const badges = useAchievements(widgets.includes('badges') ? userId : undefined);
  const quotes = useQuery({ queryKey: ['quotes', userId], queryFn: () => listQuotes(userId), enabled: widgets.includes('quote') });
  const review = useQuery({
    queryKey: ['pinnedReview', userId],
    enabled: widgets.includes('review'),
    queryFn: async () =>
      (
        await supabase
          .from('reviews')
          .select('id, rating, body, headline, book:books(id, title, cover_url)')
          .eq('user_id', userId)
          .order('like_count', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data as { id: string; rating: number; body: string | null; headline: string | null; book: { id: string; title: string; cover_url: string | null } | null } | null,
  });
  const comms = useQuery({ queryKey: ['my-communities', userId], queryFn: () => myCommunities(userId), enabled: widgets.includes('communities') });
  const guestbook = useQuery({ queryKey: ['guestbook', userId], queryFn: () => listGuestbook(userId), enabled: widgets.includes('guestbook') });
  const go = (fn: () => void) => (preview ? undefined : fn);
  const year = new Date().getFullYear();

  const blocks: Partial<Record<Widget, ReactNode>> = {
    status:
      status || song ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <MusicNotesIcon size={20} weight="fill" color={colors.accent} />
              <View style={{ position: 'absolute', right: -2, top: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.good, borderWidth: 2, borderColor: colors.surface }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {status || 'Reading'}
              </Text>
              {song ? (
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {song}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null,
    top4: (favs.data ?? []).length ? (
      <View>
        <SectionHead title={isMe ? 'My four' : 'Their four'} />
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg }}>
          {(favs.data ?? []).slice(0, 4).map((b) => (
            <Press key={b.id} onPress={go(() => openBook(b.id))} style={{ flex: 1 }}>
              <Cover uri={b.cover_url} title={b.title} author={b.authors} width={78} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
            </Press>
          ))}
        </View>
      </View>
    ) : isMe && !preview ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text variant="callout" tone="muted">
          Pick your four favourites from a book page: rate it five stars and it appears here.
        </Text>
      </View>
    ) : null,
    reading: (reading.data ?? []).length ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
            Reading now
          </Text>
          {(reading.data ?? []).slice(0, 3).map((r) => {
            const pct = r.book.page_count_estimate ? (r.current_page ?? 0) / r.book.page_count_estimate : (r.progress_percent ?? 0) / 100;
            return (
              <Press key={r.id} onPress={go(() => openBook(r.book.id))} style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Cover uri={r.book.cover_url} title={r.book.title} width={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {r.book.title}
                  </Text>
                  <Progress value={pct} style={{ marginTop: spacing.sm }} />
                </View>
                <Text variant="caption" tone="muted">
                  {Math.round(pct * 100)}%
                </Text>
              </Press>
            );
          })}
        </View>
      </View>
    ) : null,
    goal: (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Press onPress={go(() => isMe && router.push('/goals'))} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <Ring value={goal.data?.target ? goal.data.read / goal.data.target : 0} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{goal.data?.target ? `${goal.data.read} of ${goal.data.target} books` : `${goal.data?.read ?? 0} books in ${year}`}</Text>
            <Text variant="small" tone="muted">
              {goal.data?.target ? (goal.data.read >= goal.data.target ? 'Goal reached' : `${goal.data.target - goal.data.read} to go this year`) : 'No goal set'}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <FireIcon size={22} weight="fill" color={colors.accent} />
            <Text variant="small" style={{ fontFamily: fonts.bold }}>
              {streak.data?.current ?? 0}
            </Text>
            <Text variant="micro" tone="muted" style={{ fontFamily: fonts.regular }}>
              days
            </Text>
          </View>
        </Press>
      </View>
    ),
    year: stats.data ? (
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg }}>
        {[
          [String(stats.data.booksRead), 'books'],
          [fmt(stats.data.pages), 'pages'],
          [String(stats.data.pagesPerDay), 'pages a day'],
        ].map(([v, l]) => (
          <View key={l} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 20 }}>{v}</Text>
            <Text variant="caption" tone="muted">
              {l} in {year}
            </Text>
          </View>
        ))}
      </View>
    ) : null,
    quote: quotes.data?.[0] ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ overflow: 'hidden', borderRadius: radius.card, padding: spacing.lg }}>
          <ThemeFill theme={look.theme} />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
          <QuotesIcon size={26} weight="fill" color="rgba(255,255,255,0.7)" />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, marginTop: spacing.sm }} color="#fff">
            {quotes.data[0].body}
          </Text>
          {quotes.data[0].book ? (
            <Text variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: spacing.md }}>
              {quotes.data[0].book.title}
            </Text>
          ) : null}
        </View>
      </View>
    ) : null,
    review: review.data?.book ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Press onPress={go(() => openBook(review.data!.book!.id))} style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Cover uri={review.data.book.cover_url} title={review.data.book.title} width={40} />
            <View>
              <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
                Pinned review
              </Text>
              <Text variant="bodyStrong">{review.data.book.title}</Text>
            </View>
          </View>
          <Text variant="callout" style={{ marginTop: spacing.md }} numberOfLines={4}>
            {review.data.headline ?? review.data.body}
          </Text>
        </Press>
      </View>
    ) : null,
    wrapped: isMe ? (
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg }}>
        <Press onPress={go(() => router.push({ pathname: '/wrapped', params: { period: 'month' } }))} style={{ flex: 1, aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.accent, padding: spacing.base, justifyContent: 'space-between' }}>
          <Text variant="small" tone="onAccent" style={{ fontFamily: fonts.semibold, opacity: 0.75 }}>
            This month
          </Text>
          <Text tone="onAccent" style={{ fontFamily: fonts.bold, fontSize: 24, lineHeight: 25 }}>
            Monthly{'\n'}Wrapped
          </Text>
        </Press>
        <Press onPress={go(() => router.push({ pathname: '/wrapped', params: { period: 'year' } }))} style={{ flex: 1, aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.ink, padding: spacing.base, justifyContent: 'space-between' }}>
          <Text variant="small" color={colors.bg} style={{ fontFamily: fonts.semibold, opacity: 0.6 }}>
            {year}
          </Text>
          <Text color={colors.bg} style={{ fontFamily: fonts.bold, fontSize: 24, lineHeight: 25 }}>
            Your year{'\n'}in books
          </Text>
        </Press>
      </View>
    ) : null,
    badges: (badges.data ?? []).some((b) => b.earned_at) ? (
      <View>
        <SectionHead title="Achievements" action={`${(badges.data ?? []).filter((b) => b.earned_at).length} of ${(badges.data ?? []).length}`} onAction={go(() => router.push({ pathname: '/achievements', params: { userId } }))} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {(badges.data ?? [])
            .filter((b) => b.earned_at)
            .slice(0, 8)
            .map((b) => {
              const Icon = badgeIcon(b.icon);
              return (
                <View key={b.id} style={{ width: 124, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} weight="fill" color={colors.accent} />
                  </View>
                  <Text variant="callout" style={{ fontFamily: fonts.semibold, marginTop: 10 }}>
                    {b.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {b.description}
                  </Text>
                </View>
              );
            })}
        </ScrollView>
      </View>
    ) : null,
    shelf: (read.data ?? []).length ? (
      <View>
        <SectionHead title="Virtual shelf" action={`${(read.data ?? []).length} books`} onAction={go(() => router.push({ pathname: '/shelf/[id]', params: { id: `${userId}:read`, name: 'Read' } }))} />
        <View style={{ marginHorizontal: spacing.lg, overflow: 'hidden', borderRadius: radius.card, padding: spacing.base, paddingBottom: 4 }}>
          <ThemeFill theme={look.theme} />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />
          {[0, 1, 2].map((row) => {
            const items = (read.data ?? []).slice(row * 7, row * 7 + 7);
            if (!items.length) return null;
            return (
              <View key={row} style={{ marginBottom: spacing.base }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 }}>
                  {items.map((e, i) => (
                    <Press key={e.id} onPress={go(() => openBook(e.book.id))} style={{ transform: [{ rotate: i === 3 && row === 0 ? '-6deg' : i === 5 && row === 2 ? '5deg' : '0deg' }] }}>
                      <Cover uri={e.book.cover_url} title={e.book.title} width={40} />
                    </Press>
                  ))}
                </View>
                <Plank shelf={look.shelf} theme={look.theme} />
              </View>
            );
          })}
        </View>
      </View>
    ) : null,
    genres: stats.data && (stats.data.genres.length || stats.data.moods.length) ? (
      <View>
        <SectionHead title="Genres and moods" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg }}>
          {[...stats.data.genres.map((g, i) => ({ name: g.name, w: i === 0 ? 3 : i < 3 ? 2 : 1 })), ...stats.data.moods.slice(0, 5).map((m, i) => ({ name: m.name, w: i === 0 ? 2 : 1 }))].map((t) => (
            <View key={t.name} style={{ borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.w === 3 ? colors.accent : t.w === 2 ? colors.accentSoft : colors.surface2 }}>
              <Text variant={t.w === 3 ? 'callout' : 'small'} style={{ fontFamily: fonts.medium }} color={t.w === 3 ? colors.onAccent : t.w === 2 ? colors.accent : colors.ink}>
                {t.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    ) : null,
    authors: stats.data?.totalRead ? (
      <View>
        <SectionHead title="Favourite authors" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
          {[...new Set(stats.data.books.filter((b) => b.status === 'read' && (b.rating ?? 0) >= 4).map((b) => b.authors.split(',')[0]).filter(Boolean))].slice(0, 6).map((a) => (
            <Press key={a} onPress={go(() => router.push({ pathname: '/author/[name]', params: { name: a } }))} style={{ width: 72, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 20 }} tone="accent">
                  {a
                    .split(' ')
                    .filter((p) => /^[A-ZÀ-Ý]/.test(p) && !p.endsWith('.'))
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')}
                </Text>
              </View>
              <Text variant="caption" align="center" numberOfLines={2} style={{ marginTop: 6 }}>
                {a}
              </Text>
            </Press>
          ))}
        </ScrollView>
      </View>
    ) : null,
    tbr: (want.data ?? []).length ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <View style={{ width: 120, height: 86 }}>
            {(want.data ?? []).slice(0, 4).map((e, i) => (
              <View key={e.id} style={{ position: 'absolute', bottom: 0, left: i * 22, zIndex: 4 - i, transform: [{ rotate: `${(i - 1.5) * 5}deg` }] }}>
                <Cover uri={e.book.cover_url} title={e.book.title} width={52} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
              Up next
            </Text>
            <Text variant="title">{(want.data ?? []).length} books</Text>
            <Press onPress={go(() => router.push({ pathname: '/shelf/[id]', params: { id: `${userId}:want_to_read`, name: 'Want to read' } }))} style={{ marginTop: 4 }}>
              <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
                See the pile
              </Text>
            </Press>
          </View>
        </View>
      </View>
    ) : null,
    communities: (comms.data ?? []).length ? (
      <View>
        <SectionHead title="Communities" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {(comms.data ?? []).slice(0, 3).map((c) => (
            <Press key={c.id} onPress={go(() => openCommunity(c.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.tile, overflow: 'hidden' }}>
                <CommunityCover c={c} height={44} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {c.member_count} members
                </Text>
              </View>
              <UsersThreeIcon size={18} color={colors.muted} />
            </Press>
          ))}
        </View>
      </View>
    ) : null,
    guestbook: <Guestbook ownerId={userId} entries={guestbook.data ?? []} preview={preview} />,
  };

  return (
    <View style={{ gap: spacing.xxl, paddingTop: spacing.sm }}>
      {widgets.map((w) => {
        const node = blocks[w as Widget];
        return node ? <View key={w}>{node}</View> : null;
      })}
    </View>
  );
}

function Guestbook({ ownerId, entries, preview }: { ownerId: string; entries: Awaited<ReturnType<typeof listGuestbook>>; preview?: boolean }) {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const sign = useMutation({
    mutationFn: () => signGuestbook(ownerId, me, note),
    onSuccess: () => {
      setNote('');
      void qc.invalidateQueries({ queryKey: ['guestbook', ownerId] });
      toast('Note left in the guestbook');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <View>
      <SectionHead title="Guestbook" action={entries.length ? `${entries.length} notes` : undefined} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {entries.slice(0, 5).map((g) => (
          <View key={g.id} style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
            <Avatar uri={g.author?.avatar_url} name={g.author?.display_name} size={30} />
            <View style={{ flex: 1 }}>
              <Text variant="small">
                <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                  {(g.author?.display_name ?? g.author?.username ?? '').split(' ')[0]}
                </Text>{' '}
                <Text variant="small" tone="faint">
                  {relativeTime(g.created_at)}
                </Text>
              </Text>
              <Text variant="callout">{g.body}</Text>
            </View>
          </View>
        ))}
        {entries.length === 0 ? (
          <Text variant="callout" tone="muted">
            {ownerId === me ? 'Visitors can leave you notes here.' : 'Be the first to sign the guestbook.'}
          </Text>
        ) : null}
        {!preview && ownerId !== me ? (
          <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface2, paddingLeft: spacing.base, paddingRight: 6 }}>
            <ChatTeardropTextIcon size={18} color={colors.muted} />
            <TextInput value={note} onChangeText={setNote} maxLength={280} placeholder="Leave a note in the guestbook" placeholderTextColor={colors.faint} style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }} />
            {note.trim() ? (
              <Press onPress={() => sign.mutate()} style={{ height: 32, borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: 12, justifyContent: 'center' }}>
                <Text variant="small" tone="onAccent" style={{ fontFamily: fonts.semibold }}>
                  Send
                </Text>
              </Press>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/feed-card';
import { Flourish, Glyph, OrnateFrame, type GlyphName } from '@/components/ornaments';
import { promptReport } from '@/components/report-sheet';
import { BookCover, Button, EmptyState, IconButton, ProgressBar, Skeleton, Text, TextField } from '@/components/ui';
import { useNook } from '@/features/nook/use-nook';
import { useAchievements, useFavoriteGenres, useMyId, useProgress, useReadingGoal, useStatistics } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { listLibrary, setGoal } from '@/services/library';
import type { Profile } from '@/services/profile';
import { blockUser, follow, getFeed, getFollowState, unfollow } from '@/services/social';
import { fonts, layout, radius, sealColors, spacing, useTheme } from '@/theme';

import { BookShelf } from './book-shelf';
import { NookBackdrop } from './nook-backdrop';
import { Portrait } from './portrait';

const SEAL_ICON: Record<string, GlyphName> = {
  sunrise: 'sun',
  zap: 'bolt',
  award: 'award',
  star: 'star',
  sun: 'sun',
  search: 'search',
  feather: 'feather-alt',
  eye: 'eye',
};

/**
 * A reader's Nook: their library-room backdrop, portrait, treasured shelf,
 * current obsession, words they keep and the seals they've earned.
 */
export function NookView({ profile, onBack }: { profile: Profile; onBack?: () => void }) {
  const me = useMyId()!;
  const isMe = profile.id === me;
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const name = profile.display_name ?? profile.username;

  const nook = useNook(profile.id);
  const stats = useStatistics(profile.id);
  const progress = useProgress(profile.id);
  const achievements = useAchievements(profile.id);
  const genres = useFavoriteGenres(profile.id);
  const goal = useReadingGoal(profile.id);
  const followState = useQuery({ queryKey: qk.follow(profile.id), queryFn: () => getFollowState(me, profile.id), enabled: !isMe });
  const read = useQuery({ queryKey: qk.library(`nook-read-${profile.id}`), queryFn: () => listLibrary({ userId: profile.id, status: 'read', sort: 'updated' }) });
  const posts = useQuery({ queryKey: ['feed', 'user', profile.id], queryFn: () => getFeed({ viewerId: me, scope: 'discover', userId: profile.id }) });

  const settings = nook.data?.settings;
  const seal = sealColors[settings?.seal ?? 'wine'];
  const sealColor = scheme === 'dark' ? seal.light : seal.color;
  const restricted = !isMe && profile.is_private && followState.data !== 'following';
  const bannerH = Math.min(380, Math.round(width * 0.95)) + insets.top;

  const toggleFollow = useMutation({
    mutationFn: () => (followState.data === 'none' ? follow(me, profile.id) : unfollow(me, profile.id)),
    onSuccess: () => {
      void followState.refetch();
      void queryClient.invalidateQueries({ queryKey: qk.stats(profile.id) });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e) => Alert.alert('Could not update', toAppError(e).message),
  });

  const moreMenu = () =>
    Alert.alert(name, undefined, [
      { text: 'Share Nook', onPress: () => void Share.share({ message: `Visit ${name}'s Nook on GriMore: @${profile.username}` }) },
      { text: 'Report', onPress: () => promptReport({ reporterId: me, userId: profile.id }) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Block ${name}?`, 'They will no longer see your posts or interact with you, and you will stop following each other.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block', style: 'destructive', onPress: () => blockUser(me, profile.id).then(() => router.back(), (e) => Alert.alert('Could not block', toAppError(e).message)) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const earned = (achievements.data ?? []).filter((a) => a.earned_at);
  const epithet = settings?.title || (stats.data ? `Keeper of ${stats.data.books_total} ${stats.data.books_total === 1 ? 'tome' : 'tomes'}` : ' ');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: layout.tabBarHeight + insets.bottom + spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Backdrop */}
      <NookBackdrop scene={settings?.scene ?? 'great-hall'} backgroundUrl={settings?.background_url} style={{ height: bannerH }}>
        <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.base, right: spacing.base, flexDirection: 'row', justifyContent: 'space-between' }}>
          {onBack ? <FloatingButton icon="arrow-left" label="Back" onPress={onBack} /> : <View />}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {isMe ? (
              <>
                <FloatingButton icon="feather" label="Arrange your Nook" onPress={() => router.push('/nook/edit')} />
                <FloatingButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
              </>
            ) : (
              <FloatingButton icon="more-horizontal" label="More options" onPress={moreMenu} />
            )}
          </View>
        </View>
      </NookBackdrop>

      <View style={{ paddingHorizontal: layout.screenPadding, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
        {/* Identity, overlapping the backdrop */}
        <View style={{ alignItems: 'center', marginTop: -96, gap: spacing.sm }}>
          <Portrait name={name} uri={profile.avatar_url} frame={settings?.frame ?? 'arch'} size={104} color={colors.gold} />
          <Text variant="title1" align="center" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
            {name}
          </Text>
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 18, color: sealColor }} align="center">
            {epithet}
          </Text>
          <Text variant="caption" align="center">
            @{profile.username}
            {profile.is_private ? '  ·  private Nook' : ''}
            {'   ·   '}
            {stats.data?.followers_count ?? 0} followers · {stats.data?.following_count ?? 0} following
          </Text>
          {profile.bio ? (
            <Text variant="serifBody" align="center" style={{ maxWidth: 440, marginTop: spacing.xs }}>
              {profile.bio}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            {isMe ? (
              <>
                <Button title="Arrange my Nook" size="sm" icon="feather" onPress={() => router.push('/nook/edit')} style={{ backgroundColor: sealColor }} />
                <Button title="Edit profile" size="sm" variant="secondary" onPress={() => router.push('/profile/edit')} />
              </>
            ) : (
              <Button
                title={followState.data === 'following' ? 'Following' : followState.data === 'pending' ? 'Requested' : profile.is_private ? 'Request to follow' : 'Follow'}
                variant={followState.data === 'none' ? 'primary' : 'secondary'}
                size="sm"
                loading={toggleFollow.isPending || followState.isLoading}
                onPress={() => toggleFollow.mutate()}
              />
            )}
          </View>
        </View>

        <Flourish glyph="dragon" width={240} style={{ marginVertical: spacing.xl }} />

        {restricted ? (
          <EmptyState compact icon="lock" title="This Nook is private" body={`Follow ${name} to step inside their library, shelves and reviews.`} />
        ) : (
          <View style={{ gap: spacing.xxl }}>
            {/* Ledger */}
            <OrnateFrame padding={spacing.base}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Ledger value={stats.data?.books_total} label="tomes" />
                <Ledger value={stats.data?.books_read} label="read" />
                <Ledger value={stats.data ? compact(stats.data.pages_read) : undefined} label="pages" />
                <Ledger value={progress.data?.current_streak} label="day streak" />
              </View>
            </OrnateFrame>

            {/* Current obsession */}
            {nook.data?.featured ? (
              <View style={{ gap: spacing.md }}>
                <Heading eyebrow="Current obsession" title={nook.data.featured.title} color={sealColor} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/book/[id]', params: { id: nook.data!.featured!.id } })}
                  style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}
                >
                  <BookCover title={nook.data.featured.title} author={nook.data.featured.authors} uri={nook.data.featured.cover_url} width={110} />
                  <View style={{ flex: 1, gap: spacing.sm }}>
                    <Text variant="callout" tone="muted">
                      {nook.data.featured.authors}
                    </Text>
                    {nook.data.quote ? (
                      <Text variant="quote" style={{ fontSize: 18, lineHeight: 25 }} numberOfLines={6}>
                        “{nook.data.quote.body}”
                      </Text>
                    ) : null}
                    {nook.data.quote?.attribution ? <Text variant="caption">{nook.data.quote.attribution}</Text> : null}
                  </View>
                </Pressable>
              </View>
            ) : isMe ? (
              <EmptyState compact icon="star" title="Choose a current obsession" body="Feature a favourite book at the heart of your Nook." actionLabel="Arrange my Nook" onAction={() => router.push('/nook/edit')} />
            ) : null}

            {/* Treasured shelf */}
            {nook.data && nook.data.favourites.length ? (
              <View style={{ gap: spacing.md }}>
                <Heading eyebrow={`${nook.data.favourites.length} treasured`} title="The treasured shelf" color={sealColor} />
                <BookShelf books={nook.data.favourites} wood={settings?.shelf ?? 'oak'} />
              </View>
            ) : nook.isLoading ? (
              <Skeleton height={160} />
            ) : null}

            {/* Nightstand */}
            {nook.data?.reading.length ? (
              <View style={{ gap: spacing.md }}>
                <Heading eyebrow="By candlelight" title="On the nightstand" color={sealColor} />
                <BookShelf books={nook.data.reading} wood={settings?.shelf ?? 'oak'} width={70} />
              </View>
            ) : null}

            {/* Kindred authors & genres */}
            {nook.data?.authors.length || genres.data?.length ? (
              <View style={{ gap: spacing.md, alignItems: 'center' }}>
                <Text variant="eyebrow" style={{ color: sealColor }}>
                  Kindred spirits
                </Text>
                {nook.data?.authors.length ? (
                  <Text variant="title3" align="center" style={{ fontFamily: fonts.serifItalic, fontSize: 22 }}>
                    {nook.data.authors.map((a) => a.name).join('  ·  ')}
                  </Text>
                ) : null}
                {genres.data?.length ? (
                  <Text variant="caption" align="center" style={{ letterSpacing: 1 }}>
                    {genres.data.map((g) => g.name.toUpperCase()).join('   ✦   ')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Reading goal */}
            <Goal isMe={isMe} userId={profile.id} target={goal.data?.target ?? null} read={goal.data?.read ?? 0} year={goal.data?.year ?? new Date().getFullYear()} onSaved={() => void goal.refetch()} />

            {/* Seals */}
            <View style={{ gap: spacing.md }}>
              <Heading eyebrow={`${earned.length} of ${achievements.data?.length ?? 0} earned`} title="Seals" color={sealColor} />
              {earned.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base }}>
                  {earned.map((a) => (
                    <View key={a.id} accessible accessibilityLabel={`${a.name}: ${a.description}`} style={{ alignItems: 'center', gap: spacing.xs, width: 76 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: sealColor, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.gold }}>
                        <Glyph name={SEAL_ICON[a.icon] ?? 'star'} size={20} color={colors.goldSoft} />
                      </View>
                      <Text variant="caption" align="center" numberOfLines={2} style={{ fontSize: 11 }}>
                        {a.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text variant="callout" tone="muted">
                  {isMe ? 'Seals are earned by reading, reviewing and the daily riddles.' : 'No seals yet.'}
                </Text>
              )}
            </View>

            {/* Recently finished */}
            {read.data?.items.length ? (
              <View style={{ gap: spacing.md }}>
                <Heading eyebrow="The finished shelf" title="Recently read" color={sealColor} />
                <BookShelf books={read.data.items.map((e) => e.book)} wood={settings?.shelf ?? 'oak'} width={72} />
              </View>
            ) : null}

            {/* Writings */}
            <View>
              <Heading eyebrow="Marginalia" title="Reviews & notes" color={sealColor} />
              {posts.data?.items.length ? (
                posts.data.items.slice(0, 5).map((item) => <FeedCard key={`${item.item_type}:${item.id}`} item={item} compact />)
              ) : (
                <Text variant="callout" tone="muted" style={{ marginTop: spacing.md }}>
                  {isMe ? 'Review a book or share a thought and it will be written here.' : 'Nothing written yet.'}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function FloatingButton({ icon, label, onPress }: { icon: 'arrow-left' | 'feather' | 'settings' | 'more-horizontal'; label: string; onPress: () => void }) {
  return (
    <View style={{ borderRadius: radius.full, backgroundColor: 'rgba(20,14,9,0.45)' }}>
      <IconButton icon={icon} label={label} onPress={onPress} color="#F6EEDD" />
    </View>
  );
}

function Heading({ eyebrow, title, color }: { eyebrow: string; title: string; color: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="eyebrow" style={{ color }}>
        {eyebrow}
      </Text>
      <Text variant="title2" numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

function Ledger({ value, label }: { value: number | string | undefined; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${value ?? 0} ${label}`}>
      <Text variant="numeral" style={{ fontSize: 28, lineHeight: 30 }}>
        {value ?? '–'}
      </Text>
      <Text variant="eyebrow" style={{ fontSize: 9.5, letterSpacing: 1.4 }}>
        {label}
      </Text>
    </View>
  );
}

function compact(n: number) {
  return n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();
}

function Goal({ isMe, userId, target, read, year, onSaved }: { isMe: boolean; userId: string; target: number | null; read: number; year: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(target ? String(target) : '12');
  const [error, setError] = useState<string | null>(null);
  if (!target && !isMe) return null;

  if (editing) {
    return (
      <View style={{ gap: spacing.md }}>
        <Text variant="bodyStrong">How many books would you like to read in {year}?</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField value={value} onChangeText={(t) => setValue(t.replace(/\D/g, ''))} keyboardType="number-pad" error={error ?? undefined} accessibilityLabel="Goal" />
          </View>
          <Button
            title="Save"
            onPress={() => {
              const n = Number(value);
              if (!n || n > 1000) return setError('Choose between 1 and 1000');
              setGoal(userId, year, n).then(
                () => {
                  setEditing(false);
                  onSaved();
                },
                (e) => setError(toAppError(e).message),
              );
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <Pressable disabled={!isMe} onPress={() => setEditing(true)} accessibilityRole={isMe ? 'button' : undefined} accessibilityHint={isMe ? 'Edit reading goal' : undefined} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="eyebrow">The {year} quest</Text>
        <Text variant="caption">{target ? `${read} of ${target} books` : 'Tap to set a goal'}</Text>
      </View>
      {target ? <ProgressBar value={read / target} tone="olive" height={6} /> : null}
    </Pressable>
  );
}

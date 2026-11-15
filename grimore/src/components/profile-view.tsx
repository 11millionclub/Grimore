import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { AchievementGrid } from '@/components/achievement-grid';
import { MyCorner } from '@/components/corner/my-corner';
import { FeedCard } from '@/components/feed-card';
import { promptReport } from '@/components/report-sheet';
import { Shelf } from '@/components/shelf';
import { Avatar, Button, Chip, ChipGroup, EmptyState, IconButton, ProgressBar, SectionHeader, Skeleton, Stat, Surface, Text, TextField } from '@/components/ui';
import { useCorner } from '@/features/corner/use-corner';
import { useAchievements, useFavoriteGenres, useMyId, useProgress, useReadingGoal, useStatistics } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { listLibrary, setGoal } from '@/services/library';
import type { Profile } from '@/services/profile';
import { blockUser, follow, getFeed, getFollowState, unfollow } from '@/services/social';
import { spacing } from '@/theme';

export function ProfileView({ profile }: { profile: Profile }) {
  const me = useMyId()!;
  const isMe = profile.id === me;
  const queryClient = useQueryClient();
  const name = profile.display_name ?? profile.username;

  const stats = useStatistics(profile.id);
  const progress = useProgress(profile.id);
  const achievements = useAchievements(profile.id);
  const genres = useFavoriteGenres(profile.id);
  const goal = useReadingGoal(profile.id);
  const corner = useCorner(profile.id, name.split(' ')[0]);
  const followState = useQuery({ queryKey: qk.follow(profile.id), queryFn: () => getFollowState(me, profile.id), enabled: !isMe });
  const read = useQuery({ queryKey: qk.library(`profile-read-${profile.id}`), queryFn: () => listLibrary({ userId: profile.id, status: 'read', sort: 'updated' }) });
  const posts = useQuery({ queryKey: ['feed', 'user', profile.id], queryFn: () => getFeed({ viewerId: me, scope: 'discover', userId: profile.id }) });

  const toggleFollow = useMutation({
    mutationFn: () => (followState.data === 'none' ? follow(me, profile.id) : unfollow(me, profile.id)),
    onSuccess: () => {
      void followState.refetch();
      void queryClient.invalidateQueries({ queryKey: qk.stats(profile.id) });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e) => Alert.alert('Could not update', toAppError(e).message),
  });

  const restricted = !isMe && profile.is_private && followState.data !== 'following';

  const moreMenu = () =>
    Alert.alert(name, undefined, [
      { text: 'Share profile', onPress: () => void Share.share({ message: `Find ${name} on GriMore: @${profile.username}` }) },
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

  return (
    <View style={{ gap: spacing.xxl }}>
      {/* Identity */}
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name} uri={profile.avatar_url} size={96} />
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text variant="title1" align="center" accessibilityRole="header">
            {name}
          </Text>
          <Text variant="callout" tone="muted">
            @{profile.username}
            {profile.is_private ? '  ·  private' : ''}
          </Text>
        </View>
        {profile.bio ? (
          <Text variant="serifBody" align="center" style={{ maxWidth: 420 }}>
            {profile.bio}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs }}>
          <Text variant="callout">
            <Text variant="bodyStrong">{stats.data?.followers_count ?? 0}</Text> <Text variant="callout" tone="muted">followers</Text>
          </Text>
          <Text variant="callout">
            <Text variant="bodyStrong">{stats.data?.following_count ?? 0}</Text> <Text variant="callout" tone="muted">following</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {isMe ? (
            <>
              <Button title="Edit profile" variant="secondary" size="sm" icon="edit-2" onPress={() => router.push('/profile/edit')} />
              <Button title="Share" variant="secondary" size="sm" icon="share" onPress={() => void Share.share({ message: `Find me on GriMore: @${profile.username}` })} />
            </>
          ) : (
            <>
              <Button
                title={followState.data === 'following' ? 'Following' : followState.data === 'pending' ? 'Requested' : profile.is_private ? 'Request to follow' : 'Follow'}
                variant={followState.data === 'none' ? 'primary' : 'secondary'}
                size="sm"
                loading={toggleFollow.isPending || followState.isLoading}
                onPress={() => toggleFollow.mutate()}
              />
              <IconButton icon="more-horizontal" label="More options" filled onPress={moreMenu} />
            </>
          )}
        </View>
      </View>

      {restricted ? (
        <Surface muted>
          <EmptyState compact icon="lock" title="This library is private" body={`Follow ${name} to see their shelves, reviews and reading life.`} />
        </Surface>
      ) : (
        <>
          {/* Numbers */}
          <Surface style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Stat align="center" value={stats.data?.books_read ?? '–'} label="books read" />
            <Stat align="center" value={stats.data ? compact(stats.data.pages_read) : '–'} label="pages" />
            <Stat align="center" value={progress.data?.current_streak ?? '–'} label="day streak" />
            <Stat align="center" value={stats.data?.total_xp ?? '–'} label="XP" />
          </Surface>

          {/* Goal */}
          <Goal isMe={isMe} userId={profile.id} target={goal.data?.target ?? null} read={goal.data?.read ?? 0} year={goal.data?.year ?? new Date().getFullYear()} onSaved={() => void goal.refetch()} />

          {/* My Corner */}
          {corner.data ? <MyCorner data={corner.data} onEdit={isMe ? () => router.push('/corner/edit') : undefined} /> : <Skeleton height={260} rounded={20} />}

          {/* Genres */}
          {genres.data?.length ? (
            <View>
              <SectionHeader eyebrow="Taste" title="Favourite genres" />
              <ChipGroup>
                {genres.data.map((g) => (
                  <Chip key={g.id} label={g.name} />
                ))}
              </ChipGroup>
            </View>
          ) : null}

          {/* Achievements */}
          <View>
            <SectionHeader
              eyebrow={`${achievements.data?.filter((a) => a.earned_at).length ?? 0} of ${achievements.data?.length ?? 0} earned`}
              title="Achievements"
              actionLabel={isMe ? 'Streak' : undefined}
              onAction={() => router.push('/play/streak')}
            />
            {achievements.data ? <AchievementGrid items={achievements.data} showLocked={isMe} /> : <Skeleton height={120} />}
            {!isMe && achievements.data && !achievements.data.some((a) => a.earned_at) ? (
              <Text variant="callout" tone="muted">
                No achievements yet.
              </Text>
            ) : null}
          </View>

          {/* Read shelf */}
          <View>
            <SectionHeader eyebrow="Library" title="Recently finished" actionLabel={isMe ? 'All' : undefined} onAction={() => router.push({ pathname: '/library', params: { status: 'read' } })} />
            {read.data?.items.length ? (
              <Shelf books={read.data.items.map((e) => e.book)} width={92} />
            ) : (
              <Text variant="callout" tone="muted">
                {isMe ? 'Books you finish will gather here.' : 'Nothing finished yet.'}
              </Text>
            )}
          </View>

          {/* Posts */}
          <View>
            <SectionHeader eyebrow="Writing" title="Posts & reviews" />
            {posts.data?.items.length ? (
              posts.data.items.slice(0, 5).map((item) => <FeedCard key={`${item.item_type}:${item.id}`} item={item} compact />)
            ) : (
              <Text variant="callout" tone="muted">
                {isMe ? 'Share a thought or review a book to start your page.' : 'Nothing posted yet.'}
              </Text>
            )}
          </View>
        </>
      )}
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
      <Surface style={{ gap: spacing.md }}>
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
      </Surface>
    );
  }

  return (
    <Pressable disabled={!isMe} onPress={() => setEditing(true)} accessibilityRole={isMe ? 'button' : undefined} accessibilityHint={isMe ? 'Edit reading goal' : undefined}>
      <Surface style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="eyebrow">{year} reading goal</Text>
          <Text variant="caption">{target ? `${read} of ${target}` : 'Tap to set'}</Text>
        </View>
        {target ? (
          <>
            <ProgressBar value={read / target} tone="olive" height={6} />
            <Text variant="caption">{read >= target ? 'Goal reached. Everything from here is a bonus.' : `${target - read} to go`}</Text>
          </>
        ) : (
          <Text variant="callout" tone="muted">
            Set a gentle target for the year.
          </Text>
        )}
      </Surface>
    </Pressable>
  );
}

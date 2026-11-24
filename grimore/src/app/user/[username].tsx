import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { DEFAULT_LOOK } from '@/components/corner';
import { CornerBlocks } from '@/components/corner-view';
import { PostCard } from '@/components/feed';
import { ChatCircleDotsIcon, DotsThreeIcon } from '@/components/icons';
import { ProfileHero } from '@/components/profile-hero';
import { isScene } from '@/components/library-panel';
import { GildedTabs } from '@/components/ornament';
import { Btn, EmptyState, IconBtn, Screen, Skeleton, Text, toast } from '@/components/ui';
import { useCorner, useCounts, useMyId, useProfileByUsername } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { openConversation } from '@/services/messages';
import { blockUser, follow, getFeed, getFollowState, report, unfollow } from '@/services/social';
import { DarkTheme, fonts, radius, spacing, useTheme } from '@/theme';

async function compatibility(me: string, them: string) {
  const [a, b] = await Promise.all([
    supabase.from('user_books').select('book_id').eq('user_id', me).limit(5000),
    supabase.from('user_books').select('book_id').eq('user_id', them).limit(5000),
  ]);
  const mine = new Set((a.data ?? []).map((r) => r.book_id));
  const theirs = (b.data ?? []).map((r) => r.book_id);
  const shared = theirs.filter((id) => mine.has(id));
  const union = new Set([...mine, ...theirs]).size;
  return { shared: shared.length, score: union ? Math.round(Math.min(99, 35 + (shared.length / Math.max(1, Math.min(mine.size, theirs.length))) * 64)) : 0 };
}

/** Another reader's library, lit like the room at night. */
export default function UserProfile() {
  return (
    <DarkTheme>
      <UserProfileInner />
    </DarkTheme>
  );
}

function UserProfileInner() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useProfileByUsername(username);
  const p = profile.data;
  const corner = useCorner(p?.id);
  const counts = useCounts(p?.id);
  const state = useQuery({ queryKey: ['follow', p?.id], queryFn: () => getFollowState(me, p!.id), enabled: !!p && p.id !== me });
  const compat = useQuery({ queryKey: ['compat', p?.id], queryFn: () => compatibility(me, p!.id), enabled: !!p && p.id !== me });
  const [tab, setTab] = useState<'corner' | 'activity'>('corner');
  const feed = useInfiniteQuery({
    queryKey: ['feed', 'user', p?.id, 'reviews'],
    enabled: !!p && tab === 'activity',
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getFeed({ viewerId: me, scope: 'reviews', userId: p!.id, cursor: pageParam }),
    getNextPageParam: (l) => l.nextCursor,
  });
  const toggle = useMutation({
    mutationFn: () => (state.data === 'none' ? follow(me, p!.id) : unfollow(me, p!.id)),
    onMutate: () => {
      const was = state.data;
      qc.setQueryData(['follow', p?.id], was === 'none' ? (p?.is_private ? 'pending' : 'following') : 'none');
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['myFollowing', me] }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['follow', p?.id] });
      void qc.invalidateQueries({ queryKey: ['counts', p?.id] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      toast(state.data === 'none' ? (p?.is_private ? 'Request sent' : `Following ${(p?.display_name ?? p?.username ?? '').split(' ')[0]}`) : 'Unfollowed');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const message = async () => {
    try {
      const id = await openConversation(p!.id);
      router.push({ pathname: '/chat/[id]', params: { id } });
    } catch (e) {
      toast(toAppError(e).message);
    }
  };
  const more = () =>
    Alert.alert(p?.display_name ?? p?.username ?? 'Reader', undefined, [
      { text: 'Report', onPress: () => report({ reporterId: me, reason: 'other', userId: p!.id }).then(() => toast('Thanks. We will take a look.'), (e) => toast(toAppError(e).message)) },
      { text: 'Block', style: 'destructive', onPress: () => blockUser(me, p!.id).then(() => (toast('Blocked'), router.back()), (e) => toast(toAppError(e).message)) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  if (profile.isLoading) return <Screen title="" back large={false}><Skeleton height={320} rounded={0} /></Screen>;
  if (!p) return <Screen title="Reader" back><EmptyState title="Reader not found" /></Screen>;
  if (p.id === me) return <Redirect href="/me" />;
  const c = corner.data;
  const look = c ? { theme: c.theme, frame: c.frame, shelf: c.shelf, name_style: c.name_style, pack: c.pack, banner_url: c.community_banner?.banner_url ?? null } : DEFAULT_LOOK;
  const canSee = !p.is_private || state.data === 'following';
  const items = feed.data?.pages.flatMap((x) => x.items) ?? [];

  const hero = (
    <ProfileHero
      profile={p}
      look={look}
      scene={isScene(c?.library) ? c.library : 'classic'}
      counts={counts.data}
      actions={
        <>
          <Btn size="sm" variant={state.data === 'none' ? 'primary' : 'secondary'} loading={toggle.isPending} onPress={() => toggle.mutate()}>
            {state.data === 'following' ? 'Following' : state.data === 'pending' ? 'Requested' : 'Follow'}
          </Btn>
          <Btn size="sm" variant="secondary" icon={<ChatCircleDotsIcon size={15} color={colors.ink} />} onPress={message}>
            Message
          </Btn>
        </>
      }
    >
      {compat.data && compat.data.shared > 0 ? (
        <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="small" tone="onAccent" style={{ fontFamily: fonts.bold }}>
              {compat.data.score}%
            </Text>
          </View>
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              Reading compatibility.
            </Text>{' '}
            You have {compat.data.shared} {compat.data.shared === 1 ? 'book' : 'books'} in common.
          </Text>
        </View>
      ) : null}
    </ProfileHero>
  );

  return (
    <Screen
      title={p.display_name ?? p.username}
      large={false}
      back
      hero={hero}
      barTransparent
      actions={
        <IconBtn label="More" glass onPress={more}>
          <DotsThreeIcon size={20} weight="bold" color={colors.ink} />
        </IconBtn>
      }
    >
      {!canSee ? (
        <EmptyState title="This Grimore is private" body="Follow to see their shelves and activity." />
      ) : (
        <>
          <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.lg }}>
            <GildedTabs value={tab} onChange={setTab} options={[{ value: 'corner', label: 'Grimore' }, { value: 'activity', label: 'Reviews' }]} />
          </View>
          {tab === 'corner' ? (
            <CornerBlocks userId={p.id} look={look} widgets={c?.widgets ?? ['top4', 'reading', 'shelf', 'guestbook']} status={c?.status_text} song={c?.song} library={c?.library} />
          ) : (
            <View style={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
              {items.length === 0 && !feed.isLoading ? <EmptyState title="No posts yet" /> : items.map((it) => <PostCard key={`${it.item_type}-${it.id}`} post={it} />)}
              {feed.hasNextPage ? (
                <Btn variant="ghost" size="sm" onPress={() => feed.fetchNextPage()} style={{ alignSelf: 'center' }}>
                  Load more
                </Btn>
              ) : null}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

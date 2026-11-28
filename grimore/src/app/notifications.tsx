import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { ScrollView, View } from 'react-native';

import { ChatCircleIcon, HeartIcon, MaskHappyIcon, MedalIcon, TrashIcon, TrophyIcon, UserPlusIcon, UsersThreeIcon, type IconProps } from '@/components/icons';
import { Avatar, Btn, Chip, EmptyState, IconBtn, Press, Screen, Text, toast } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { acceptFollow, clearNotifications, follow, getNotifications, markNotificationsRead, myFollowStatuses, unfollow } from '@/services/social';
import { fonts, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

type N = Awaited<ReturnType<typeof getNotifications>>[number];
type Data = { listing_id?: string; offer_id?: string; community_id?: string; thread_id?: string; event?: string; book_id?: string; anonymous?: boolean };

const ICON: Record<string, ComponentType<IconProps>> = {
  follow: UserPlusIcon,
  follow_request: UserPlusIcon,
  follow_accepted: UserPlusIcon,
  post_like: HeartIcon,
  review_like: HeartIcon,
  post_comment: ChatCircleIcon,
  review_comment: ChatCircleIcon,
  comment_reply: ChatCircleIcon,
  achievement: MedalIcon,
  game: TrophyIcon,
  community: UsersThreeIcon,
};

type Filter = 'all' | 'people' | 'reactions' | 'communities' | 'games';
const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['people', 'Followers'],
  ['reactions', 'Likes and comments'],
  ['communities', 'Communities'],
  ['games', 'Games and achievements'],
];
const FILTER_OF: Record<string, Filter> = {
  follow: 'people',
  follow_request: 'people',
  follow_accepted: 'people',
  post_like: 'reactions',
  review_like: 'reactions',
  post_comment: 'reactions',
  review_comment: 'reactions',
  comment_reply: 'reactions',
  community: 'communities',
  game: 'games',
  achievement: 'games',
};

function text(n: N) {
  const d = (n.data ?? {}) as Data;
  switch (n.type) {
    case 'follow':
      return 'started following you';
    case 'follow_request':
      return 'wants to follow you';
    case 'follow_accepted':
      return 'accepted your follow request';
    case 'post_like':
      return 'liked your post';
    case 'review_like':
      return 'liked your review';
    case 'post_comment':
      return 'commented on your post';
    case 'review_comment':
      return 'commented on your review';
    case 'comment_reply':
      return 'replied to your comment';
    case 'achievement':
      return `You earned an achievement: ${(n.achievement_id ?? '').replace(/_/g, ' ')}`;
    case 'community':
      // Anonymous communities never say who wrote.
      if (d.anonymous) return d.event === 'reply' ? 'Someone replied to your discussion' : 'A new discussion was started in your community';
      return d.event === 'reply' ? 'replied to your discussion' : 'started a discussion in your community';
    case 'game':
      return 'beat your time in today’s game';
    default:
      return 'sent you something';
  }
}

function open(n: N) {
  const d = (n.data ?? {}) as Data;
  if (n.post_id) return router.push({ pathname: '/post/[id]', params: { id: n.post_id, type: 'post' } });
  if (n.review_id) return router.push({ pathname: '/post/[id]', params: { id: n.review_id, type: 'review' } });
  if (d.thread_id) return router.push({ pathname: '/thread/[id]', params: { id: d.thread_id } });
  if (n.type === 'achievement') return router.push('/achievements');
  if (n.actor) return router.push({ pathname: '/user/[username]', params: { username: n.actor.username } });
}

export default function Notifications() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => getNotifications(me) });
  useEffect(() => {
    const t = setTimeout(() => {
      void markNotificationsRead(me).then(() => qc.invalidateQueries({ queryKey: ['unread'] }), () => undefined);
    }, 1200);
    return () => clearTimeout(t);
  }, [me, qc]);
  const mine = useQuery({ queryKey: ['followStatuses', me], queryFn: () => myFollowStatuses(me) });
  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: 'accept' | 'follow' | 'unfollow'; id: string }) => (kind === 'accept' ? acceptFollow(me, id) : kind === 'follow' ? follow(me, id) : unfollow(me, id)),
    // Flip the button straight away; the server answer confirms or rolls it back.
    onMutate: ({ kind, id }) => {
      if (kind === 'accept') return;
      qc.setQueryData<Record<string, string>>(['followStatuses', me], (old) => {
        const next = { ...(old ?? {}) };
        if (kind === 'follow') next[id] = 'accepted';
        else delete next[id];
        return next;
      });
    },
    onSuccess: (_d, v) => {
      if (v.kind === 'accept') toast('Request accepted');
      for (const key of ['followStatuses', 'follows', 'profile', 'feed']) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => {
      void qc.invalidateQueries({ queryKey: ['followStatuses', me] });
      toast(toAppError(e).message);
    },
  });
  const clear = useMutation({
    mutationFn: async () => {
      if (!(await confirmAction('Clear all notifications?', 'They are removed for good.', 'Clear all'))) return false;
      await clearNotifications(me);
      return true;
    },
    onSuccess: (done) => {
      if (!done) return;
      qc.setQueryData(['notifications'], []);
      void qc.invalidateQueries({ queryKey: ['unread'] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [openedAt] = useState(() => Date.now());
  // The Market was retired; its old notifications are no longer shown.
  const all = (q.data ?? []).filter((n) => n.type !== 'market' && n.type !== 'trade');
  const list = all.filter((n) => filter === 'all' || FILTER_OF[n.type] === filter);
  const now = openedAt;
  const section = (iso: string) => {
    const age = now - new Date(iso).getTime();
    return age < 86_400_000 ? 'Today' : age < 7 * 86_400_000 ? 'This week' : 'Earlier';
  };
  return (
    <Screen
      title="Notifications"
      back
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
      actions={
        all.length ? (
          <IconBtn label="Clear all notifications" onPress={() => clear.mutate()}>
            <TrashIcon size={20} color={colors.ink} />
          </IconBtn>
        ) : undefined
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm }}>
        {FILTERS.map(([k, label]) => (
          <Chip key={k} active={filter === k} onPress={() => setFilter(k)}>
            {label}
          </Chip>
        ))}
      </ScrollView>
      {!q.isLoading && list.length === 0 ? <EmptyState title="Nothing yet" body={filter === 'all' ? 'Follows, likes and community replies show up here.' : 'Nothing of this kind yet.'} /> : null}
      {list.map((n, i) => {
        const head = section(n.created_at);
        const showHead = i === 0 || section(list[i - 1].created_at) !== head;
        const d = (n.data ?? {}) as Data;
        const Icon = ICON[n.type] ?? HeartIcon;
        const actor = n.actor as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
        return (
          <View key={n.id}>
          {showHead ? (
            <Text variant="micro" tone="muted" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs, textTransform: 'uppercase' }}>
              {head}
            </Text>
          ) : null}
          <Press onPress={() => open(n)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: n.read_at ? 'transparent' : colors.accentSoft }}>
            <View>
              {d.anonymous ? (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }}>
                  <MaskHappyIcon size={24} color={colors.muted} />
                </View>
              ) : (
                <Avatar uri={actor?.avatar_url} name={actor?.display_name ?? actor?.username ?? 'G'} size={44} />
              )}
              <View style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={11} weight="bold" color={colors.onAccent} />
              </View>
            </View>
            <Text variant="callout" style={{ flex: 1 }}>
              {actor ? (
                <Text variant="callout" style={{ fontFamily: fonts.semibold }}>
                  {actor.display_name ?? actor.username}{' '}
                </Text>
              ) : null}
              {text(n)}{' '}
              <Text variant="callout" tone="faint">
                {relativeTime(n.created_at)}
              </Text>
            </Text>
            {n.type === 'follow_request' && actor ? (
              <Btn size="sm" onPress={() => act.mutate({ kind: 'accept', id: actor.id })}>
                Accept
              </Btn>
            ) : n.type === 'follow' && actor ? (
              mine.data?.[actor.id] ? (
                <Btn size="sm" variant="secondary" onPress={() => act.mutate({ kind: 'unfollow', id: actor.id })}>
                  {mine.data[actor.id] === 'pending' ? 'Requested' : 'Following'}
                </Btn>
              ) : (
                <Btn size="sm" onPress={() => act.mutate({ kind: 'follow', id: actor.id })}>
                  Follow back
                </Btn>
              )
            ) : null}
          </Press>
          </View>
        );
      })}
    </Screen>
  );
}

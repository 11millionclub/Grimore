import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, type ComponentType } from 'react';
import { View } from 'react-native';

import { ChatCircleIcon, HeartIcon, MedalIcon, TrophyIcon, UserPlusIcon, UsersThreeIcon, type IconProps } from '@/components/icons';
import { Avatar, Btn, EmptyState, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { acceptFollow, follow, getNotifications, markNotificationsRead } from '@/services/social';
import { fonts, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

type N = Awaited<ReturnType<typeof getNotifications>>[number];
type Data = { listing_id?: string; offer_id?: string; community_id?: string; thread_id?: string; event?: string; book_id?: string };

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
    case 'review_comment':
      return 'commented on your post';
    case 'comment_reply':
      return 'replied to your comment';
    case 'achievement':
      return `You earned an achievement: ${n.achievement_id?.replace(/_/g, ' ')}`;
    case 'community':
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
  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: 'accept' | 'follow'; id: string }) => (kind === 'accept' ? acceptFollow(me, id) : follow(me, id)),
    onSuccess: (_d, v) => toast(v.kind === 'accept' ? 'Request accepted' : 'Following'),
    onError: (e) => toast(toAppError(e).message),
  });
  // The Market was retired; its old notifications are no longer shown.
  const list = (q.data ?? []).filter((n) => n.type !== 'market' && n.type !== 'trade');
  return (
    <Screen title="Notifications" back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      {!q.isLoading && list.length === 0 ? <EmptyState title="Nothing yet" body="Follows, likes and community replies show up here." /> : null}
      {list.map((n) => {
        const Icon = ICON[n.type] ?? HeartIcon;
        const actor = n.actor as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
        return (
          <Press key={n.id} onPress={() => open(n)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: n.read_at ? 'transparent' : colors.accentSoft }}>
            <View>
              <Avatar uri={actor?.avatar_url} name={actor?.display_name ?? actor?.username ?? 'G'} size={44} />
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
              <Btn size="sm" variant="secondary" onPress={() => act.mutate({ kind: 'follow', id: actor.id })}>
                Follow back
              </Btn>
            ) : null}
          </Press>
        );
      })}
    </Screen>
  );
}

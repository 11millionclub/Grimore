import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Composer, Spoiler } from '@/components/feed';
import { ChatCircleDotsIcon } from '@/components/icons';
import { Avatar, Divider, Press, Screen, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { addReply, getCommunity, getThread, listReplies, myMembership } from '@/services/communities';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const t = useQuery({ queryKey: ['thread', id], queryFn: () => getThread(id) });
  const c = useQuery({ queryKey: ['community', t.data?.community_id], queryFn: () => getCommunity(t.data!.community_id), enabled: !!t.data });
  const member = useQuery({ queryKey: ['community', t.data?.community_id, 'me'], queryFn: () => myMembership(t.data!.community_id, me), enabled: !!t.data });
  const replies = useQuery({ queryKey: ['thread', id, 'replies'], queryFn: () => listReplies(id) });
  const reply = useMutation({
    mutationFn: (body: string) => addReply(id, me, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const d = t.data;
  return (
    <Screen
      title={c.data?.name ?? ''}
      large={false}
      back
      keyboard
      footer={
        member.data ? (
          <Composer placeholder="Write a reply" busy={reply.isPending} onSend={(x) => reply.mutateAsync(x)} />
        ) : (
          <Press onPress={() => d && router.push({ pathname: '/community/join/[id]', params: { id: d.community_id } })} style={{ padding: spacing.base, alignItems: 'center' }}>
            <Text variant="callout" tone="accent" style={{ fontFamily: fonts.semibold }}>
              Join the community to reply
            </Text>
          </Press>
        )
      }
    >
      {!d ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Skeleton height={160} rounded={radius.card} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar uri={d.author?.avatar_url} name={d.author?.display_name} size={28} />
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {d.author?.display_name ?? d.author?.username}
            </Text>
            <Text variant="small" tone="faint">
              · {relativeTime(d.created_at)}
            </Text>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 26, lineHeight: 28, marginTop: spacing.base }}>
            {d.title}
          </Text>
          {d.body ? (
            <View style={{ marginTop: spacing.md }}>
              <Spoiler hidden={d.has_spoilers}>
                <Text variant="body" style={{ fontSize: 16, lineHeight: 24, opacity: 0.9 }}>
                  {d.body}
                </Text>
              </Spoiler>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.base }}>
            <ChatCircleDotsIcon size={15} color={colors.muted} />
            <Text variant="small" tone="muted">
              {d.reply_count} {d.reply_count === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        </View>
      )}
      <Divider style={{ marginHorizontal: spacing.lg, marginVertical: spacing.lg }} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        {(replies.data ?? []).map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', gap: spacing.md }}>
            <Avatar uri={r.author?.avatar_url} name={r.author?.display_name} size={32} />
            <View style={{ flex: 1 }}>
              <Text variant="small">
                <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                  {r.author?.display_name ?? r.author?.username}
                </Text>{' '}
                <Text variant="small" tone="faint">
                  {relativeTime(r.created_at)}
                </Text>
              </Text>
              <Spoiler hidden={r.has_spoilers}>
                <Text variant="callout" style={{ marginTop: 2 }}>
                  {r.body}
                </Text>
              </Spoiler>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

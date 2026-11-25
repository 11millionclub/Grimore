import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Composer, Spoiler } from '@/components/feed';
import { ReportButton, ReportedGate } from '@/components/report-button';
import { ChatCircleDotsIcon, MaskHappyIcon, TrashIcon } from '@/components/icons';
import { Avatar, Divider, IconBtn, Press, Screen, Skeleton, Text, toast } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { addReply, getCommunity, loadThread, myMembership, removePost } from '@/services/communities';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

/** The mark shown instead of a face in anonymous communities. */
function AnonMark({ size }: { size: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }}>
      <MaskHappyIcon size={size * 0.6} color={colors.muted} />
    </View>
  );
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const full = useQuery({ queryKey: ['thread', id], queryFn: () => loadThread(id) });
  const t = { data: full.data?.thread };
  const replies = { data: full.data?.replies };
  const anonymous = !!full.data?.anonymous;
  const c = useQuery({ queryKey: ['community', t.data?.community_id], queryFn: () => getCommunity(t.data!.community_id), enabled: !!t.data });
  const member = useQuery({ queryKey: ['community', t.data?.community_id, 'me'], queryFn: () => myMembership(t.data!.community_id, me), enabled: !!t.data });
  const moderator = member.data?.role === 'host' || member.data?.role === 'moderator';
  const remove = useMutation({
    mutationFn: async ({ kind, postId }: { kind: 'thread' | 'reply'; postId: string }) => {
      if (!(await confirmAction(kind === 'thread' ? 'Remove this discussion?' : 'Remove this reply?', 'It is deleted for everyone.', 'Remove'))) return false;
      await removePost(kind, postId);
      return true;
    },
    onSuccess: (done, { kind }) => {
      if (!done) return;
      toast(kind === 'thread' ? 'Discussion removed' : 'Reply removed');
      if (kind === 'thread') {
        void qc.invalidateQueries({ queryKey: ['community', t.data?.community_id, 'threads'] });
        router.back();
      } else void qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  // In anonymous communities the server sends an alias instead of the writer.
  const who = (x: { alias?: string; author: { display_name: string | null; username: string } | null }) => (anonymous ? (x.alias ?? 'Reader') : (x.author?.display_name ?? x.author?.username ?? ''));
  const reply = useMutation({
    mutationFn: ({ body, spoiler }: { body: string; spoiler: boolean }) => addReply(id, me, body, spoiler),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['thread', id] });
      toast('Reply posted');
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
          <Composer placeholder="Write a reply" spoilers busy={reply.isPending} onSend={(body, spoiler) => reply.mutateAsync({ body, spoiler })} />
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
            {anonymous ? <AnonMark size={28} /> : <Avatar uri={d.author?.avatar_url} name={d.author?.display_name} size={28} />}
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {who(d)}
              {anonymous && d.mine ? ' (you)' : ''}
            </Text>
            <Text variant="small" tone="faint" style={{ flex: 1 }}>
              · {relativeTime(d.created_at)}
            </Text>
            <ReportButton target={{ communityThreadId: d.id }} authorId={anonymous ? (d.mine ? me : null) : d.author?.id} />
            {moderator ? (
              <IconBtn label="Remove discussion" size={30} onPress={() => remove.mutate({ kind: 'thread', postId: d.id })}>
                <TrashIcon size={16} color={colors.muted} />
              </IconBtn>
            ) : null}
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 33, marginTop: spacing.base }}>
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
            {anonymous ? <AnonMark size={32} /> : <Avatar uri={r.author?.avatar_url} name={r.author?.display_name} size={32} />}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="small" style={{ flex: 1 }}>
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {who(r)}
                    {anonymous && r.mine ? ' (you)' : ''}
                  </Text>{' '}
                  <Text variant="small" tone="faint">
                    {relativeTime(r.created_at)}
                  </Text>
                </Text>
                <ReportButton target={{ communityReplyId: r.id }} authorId={anonymous ? (r.mine ? me : null) : r.author?.id} />
                {moderator ? (
                  <IconBtn label="Remove reply" size={28} onPress={() => remove.mutate({ kind: 'reply', postId: r.id })}>
                    <TrashIcon size={14} color={colors.muted} />
                  </IconBtn>
                ) : null}
              </View>
              <ReportedGate target={{ communityReplyId: r.id }}>
                <Spoiler hidden={r.has_spoilers}>
                  <Text variant="callout" style={{ marginTop: 2 }}>
                    {r.body}
                  </Text>
                </Spoiler>
              </ReportedGate>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

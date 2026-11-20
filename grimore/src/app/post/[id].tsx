import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Composer, PostCard } from '@/components/feed';
import { Avatar, Divider, EmptyState, Press, Screen, Skeleton, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { addComment, getComments, getFeedItem } from '@/services/social';
import { fonts, radius, spacing } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function PostScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: 'post' | 'review' }>();
  const kind = type === 'review' ? 'review' : 'post';
  const me = useMyId()!;
  const qc = useQueryClient();
  const item = useQuery({ queryKey: ['post', kind, id], queryFn: () => getFeedItem(me, kind, id) });
  const comments = useQuery({ queryKey: ['comments', kind, id], queryFn: () => getComments(kind, id) });
  const send = useMutation({
    mutationFn: (body: string) => addComment(kind, id, me, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', kind, id] });
      void qc.invalidateQueries({ queryKey: ['post', kind, id] });
    },
  });
  return (
    <Screen title={kind === 'review' ? 'Review' : 'Post'} large={false} back keyboard footer={<Composer placeholder="Write a comment" busy={send.isPending} onSend={(t) => send.mutateAsync(t)} />}>
      {item.isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Skeleton height={200} rounded={radius.card} />
        </View>
      ) : item.data ? (
        <PostCard post={item.data} full />
      ) : (
        <EmptyState title="This post is not available" body="It may have been deleted, or it is only visible to some readers." />
      )}
      <Divider style={{ marginHorizontal: spacing.lg }} />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.lg }}>
        {(comments.data ?? []).length === 0 && !comments.isLoading ? (
          <Text variant="callout" tone="muted">
            No comments yet. Start the conversation.
          </Text>
        ) : (
          (comments.data ?? []).map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: spacing.md }}>
              <Press onPress={() => c.author && router.push({ pathname: '/user/[username]', params: { username: c.author.username } })}>
                <Avatar uri={c.author?.avatar_url} name={c.author?.display_name} size={32} />
              </Press>
              <View style={{ flex: 1 }}>
                <Text variant="small">
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {c.author?.display_name ?? c.author?.username}
                  </Text>{' '}
                  <Text variant="small" tone="faint">
                    {relativeTime(c.created_at)}
                  </Text>
                </Text>
                <Text variant="callout" style={{ marginTop: 2 }}>
                  {c.body}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

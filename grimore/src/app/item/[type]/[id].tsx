import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/feed-card';
import { promptReport } from '@/components/report-sheet';
import { TopBar } from '@/components/top-bar';
import { Avatar, EmptyState, ErrorState, IconButton, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { addComment, deleteComment, deleteItem, getComments, getFeedItem, type Comment } from '@/services/social';
import { layout, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function ItemScreen() {
  const { type, id } = useLocalSearchParams<{ type: 'post' | 'review'; id: string }>();
  const me = useMyId()!;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const item = useQuery({ queryKey: type === 'post' ? qk.post(id) : qk.review(id), queryFn: () => getFeedItem(me, type, id) });
  const comments = useQuery({ queryKey: qk.comments(type, id), queryFn: () => getComments(type, id) });

  const send = useMutation({
    mutationFn: () => addComment(type, id, me, draft, replyTo?.id),
    onMutate: () => setError(null),
    onSuccess: () => {
      setDraft('');
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: qk.comments(type, id) });
      void item.refetch();
    },
    onError: (e) => setError(toAppError(e).message),
  });

  const isMine = item.data?.author?.id === me;

  const menu = () => {
    if (!item.data) return;
    if (isMine) {
      Alert.alert(type === 'post' ? 'Delete post?' : 'Delete review?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteItem(type, id).then(
              () => {
                void queryClient.invalidateQueries({ queryKey: ['feed'] });
                router.back();
              },
              (e) => Alert.alert('Could not delete', toAppError(e).message),
            ),
        },
      ]);
    } else {
      promptReport({ reporterId: me, userId: item.data.author?.id, postId: type === 'post' ? id : undefined, reviewId: type === 'review' ? id : undefined });
    }
  };

  const top = comments.data?.filter((c) => !c.parent_id) ?? [];
  const replies = (parent: string) => comments.data?.filter((c) => c.parent_id === parent) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title={type === 'review' ? 'Review' : 'Post'} right={<IconButton icon={isMine ? 'trash-2' : 'flag'} label={isMine ? 'Delete' : 'Report'} onPress={menu} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <Screen edgeTop={false} scroll contentStyle={{ paddingBottom: spacing.xxl }}>
          {item.isLoading ? <Skeleton height={160} /> : null}
          {item.isError ? <ErrorState onRetry={() => void item.refetch()} /> : null}
          {item.isSuccess && !item.data ? <EmptyState icon="eye-off" title="Not available" body="This post was removed or is no longer visible to you." /> : null}
          {item.data ? <FeedCard item={item.data} /> : null}

          <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
            {comments.data?.length ? `${comments.data.length} ${comments.data.length === 1 ? 'reply' : 'replies'}` : 'Replies'}
          </Text>
          {comments.data && comments.data.length === 0 ? (
            <Text variant="callout" tone="muted">
              No replies yet. Add the first thought.
            </Text>
          ) : null}
          <View style={{ gap: spacing.lg }}>
            {top.map((c) => (
              <View key={c.id} style={{ gap: spacing.md }}>
                <CommentRow comment={c} me={me} onReply={() => setReplyTo(c)} onDelete={() => deleteComment(type, c.id).then(() => comments.refetch())} />
                {replies(c.id).map((r) => (
                  <View key={r.id} style={{ marginLeft: 40 }}>
                    <CommentRow comment={r} me={me} onDelete={() => deleteComment(type, r.id).then(() => comments.refetch())} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Screen>

        {/* Composer */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.canvas, paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm, gap: spacing.xs }}>
          {replyTo ? (
            <Pressable onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel="Cancel reply">
              <Text variant="caption">
                Replying to {replyTo.author?.display_name ?? replyTo.author?.username} · <Text variant="caption" tone="accent">cancel</Text>
              </Text>
            </Pressable>
          ) : null}
          {error ? (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField value={draft} onChangeText={setDraft} placeholder="Add a reply…" maxLength={2000} returnKeyType="send" onSubmitEditing={() => draft.trim() && send.mutate()} accessibilityLabel="Reply" />
            </View>
            <IconButton icon="send" label="Send reply" tone="accent" disabled={!draft.trim() || send.isPending} onPress={() => send.mutate()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function CommentRow({ comment, me, onReply, onDelete }: { comment: Comment; me: string; onReply?: () => void; onDelete: () => void }) {
  const name = comment.author?.display_name ?? comment.author?.username ?? 'Reader';
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <Pressable onPress={() => comment.author && router.push({ pathname: '/user/[username]', params: { username: comment.author.username } })}>
        <Avatar name={name} uri={comment.author?.avatar_url} size={28} />
      </Pressable>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="caption">
          <Text variant="caption" tone="ink" style={{ fontWeight: '600' }}>
            {name}
          </Text>{' '}
          · {relativeTime(comment.created_at)}
        </Text>
        <Text variant="body">{comment.body}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.base }}>
          {onReply ? (
            <Pressable onPress={onReply} hitSlop={8} accessibilityRole="button">
              <Text variant="caption" tone="accent">
                Reply
              </Text>
            </Pressable>
          ) : null}
          {comment.author?.id === me ? (
            <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button">
              <Text variant="caption" tone="subtle">
                Delete
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

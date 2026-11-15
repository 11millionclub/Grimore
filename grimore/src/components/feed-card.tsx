import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, BookCover, Icon, Rating, Text } from '@/components/ui';
import { useMyId, usePreferences } from '@/hooks/queries';
import { POST_KIND_META, setLiked, type FeedItem } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

/**
 * One feed entry. Reviews and posts share a frame but read differently:
 * a review leads with its book and rating; a post leads with its words.
 */
export function FeedCard({ item, compact, onChanged }: { item: FeedItem; compact?: boolean; onChanged?: (item: FeedItem) => void }) {
  const { colors } = useTheme();
  const me = useMyId()!;
  const queryClient = useQueryClient();
  const prefs = usePreferences();
  const [revealed, setRevealed] = useState(false);
  const [local, setLocal] = useState({ liked: item.liked, count: item.like_count });
  const isReview = item.item_type === 'review';
  const kind = isReview ? null : POST_KIND_META[item.kind as keyof typeof POST_KIND_META];
  const hidden = item.has_spoilers && !revealed && !prefs.data?.show_spoilers && item.author?.id !== me;

  const like = useMutation({
    mutationFn: (next: boolean) => setLiked(item.item_type, item.id, me, next),
    onMutate: (next) => setLocal((s) => ({ liked: next, count: s.count + (next ? 1 : -1) })),
    onError: (_e, next) => setLocal((s) => ({ liked: !next, count: s.count + (next ? -1 : 1) })),
    onSettled: () => {
      onChanged?.({ ...item, liked: local.liked, like_count: local.count });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const openItem = () => router.push({ pathname: '/item/[type]/[id]', params: { type: item.item_type, id: item.id } });
  const openAuthor = () => item.author && router.push({ pathname: '/user/[username]', params: { username: item.author.username } });

  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: compact ? 0 : 1, borderBottomColor: colors.border }}>
      {/* Byline */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable onPress={openAuthor} accessibilityRole="link" accessibilityLabel={`Open ${item.author?.display_name ?? item.author?.username}'s profile`}>
          <Avatar name={item.author?.display_name ?? item.author?.username ?? '?'} uri={item.author?.avatar_url} size={32} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" style={{ fontSize: 14 }} numberOfLines={1}>
            {item.author?.display_name ?? item.author?.username}
          </Text>
          <Text variant="caption">
            {isReview ? 'reviewed' : kind?.label.toLowerCase()} · {relativeTime(item.created_at)}
          </Text>
        </View>
        {isReview ? (
          <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.accentSoft }}>
            <Text variant="eyebrow" tone="accent" style={{ fontSize: 9.5 }}>
              Review
            </Text>
          </View>
        ) : kind ? (
          <Icon name={kind.icon} size={15} tone="inkSubtle" />
        ) : null}
      </View>

      {/* Body */}
      <Pressable onPress={openItem} accessibilityRole="button" accessibilityHint="Opens the conversation" style={{ gap: spacing.md }}>
        {isReview && item.book ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <BookCover title={item.book.title} author={item.book.authors} uri={item.book.cover_url} size="xs" accessible={false} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="bookTitle" numberOfLines={2}>
                {item.book.title}
              </Text>
              <Rating value={item.rating} size={13} />
            </View>
          </View>
        ) : null}

        {hidden ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contains spoilers. Tap to reveal."
            onPress={() => setRevealed(true)}
            style={{ padding: spacing.base, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}
          >
            <Icon name="eye-off" size={16} tone="inkMuted" />
            <Text variant="callout" tone="muted" style={{ flex: 1 }}>
              Contains spoilers{item.book ? ` for ${item.book.title}` : ''}. Tap to reveal.
            </Text>
          </Pressable>
        ) : (
          <>
            {item.headline ? <Text variant="title3">{item.headline}</Text> : null}
            {item.body ? (
              <Text variant={isReview ? 'serifBody' : 'body'} numberOfLines={compact ? 6 : undefined}>
                {item.body}
              </Text>
            ) : null}
          </>
        )}

        {!isReview && item.book ? (
          <Pressable
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.book!.id } })}
            accessibilityRole="link"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
          >
            <BookCover title={item.book.title} uri={item.book.cover_url} size="xs" width={32} accessible={false} />
            <View style={{ flex: 1 }}>
              <Text variant="bookTitle" style={{ fontSize: 14 }} numberOfLines={1}>
                {item.book.title}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {item.book.authors}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} tone="inkSubtle" />
          </Pressable>
        ) : null}
      </Pressable>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: spacing.xl }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={local.liked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: local.liked }}
          onPress={() => like.mutate(!local.liked)}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}
        >
          <Icon name="heart" size={17} tone={local.liked ? 'accent' : 'inkMuted'} />
          <Text variant="caption" tone={local.liked ? 'accent' : 'muted'}>
            {local.count || ''}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Comments" onPress={openItem} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
          <Icon name="message-circle" size={17} tone="inkMuted" />
          <Text variant="caption">{item.comment_count || ''}</Text>
        </Pressable>
      </View>
    </View>
  );
}

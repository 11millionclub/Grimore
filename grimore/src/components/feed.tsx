import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { BookmarkSimpleIcon, ChatCircleIcon, CheckCircleIcon, HeartIcon, PaperPlaneRightIcon, QuotesIcon, ShareFatIcon, WarningIcon } from '@/components/icons';
import { Avatar, Cover, Press, Progress, Stars, Text, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { setLiked, setSaved, type FeedItem } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export function Ring({ value, size = 52, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const { colors } = useTheme();
  const r = (size - stroke - 2) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }} accessibilityElementsHidden>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surface3} strokeWidth={stroke} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - v)} />
    </Svg>
  );
}

const name = (a: FeedItem['author']) => a?.display_name || a?.username || 'A reader';

function verb(p: FeedItem) {
  switch (p.kind) {
    case 'review':
      return 'reviewed';
    case 'progress':
      return `is on page ${p.page ?? '?'} of`;
    case 'quote':
      return 'saved a quote from';
    case 'finished':
      return 'finished';
    case 'recommendation':
      return 'recommends';
    case 'question':
      return 'asked about';
    default:
      return p.book ? 'wrote about' : 'posted';
  }
}

/** Blurs its children until tapped. */
export function Spoiler({ hidden, label = 'Spoiler. Tap to read', children }: { hidden: boolean; label?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (!hidden || open) return <>{children}</>;
  return (
    <Press onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} style={{ borderRadius: radius.tile, backgroundColor: colors.surface2, paddingVertical: spacing.base, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full }}>
        <WarningIcon size={13} weight="bold" color={colors.bg} />
        <Text variant="micro" color={colors.bg}>
          {label}
        </Text>
      </View>
    </Press>
  );
}

export function PostCard({ post, full = false, onComment }: { post: FeedItem; full?: boolean; onComment?: () => void }) {
  const { colors } = useTheme();
  const me = useMyId();
  const qc = useQueryClient();
  const [liked, setLikedLocal] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [saved, setSavedLocal] = useState(post.saved);
  const like = useMutation({
    mutationFn: (v: boolean) => setLiked(post.item_type, post.id, me!, v),
    onError: (e, v) => {
      setLikedLocal(!v);
      setLikes((n) => n + (v ? -1 : 1));
      toast(toAppError(e).message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
  const save = useMutation({ mutationFn: (v: boolean) => setSaved(post.item_type, post.id, me!, v), onError: (_e, v) => setSavedLocal(!v) });
  const open = () => !full && router.push({ pathname: '/post/[id]', params: { id: post.id, type: post.item_type } });
  const openUser = () => post.author && router.push({ pathname: '/user/[username]', params: { username: post.author.username } });
  const b = post.book;
  const pct = b?.pages && post.page ? post.page / b.pages : null;

  return (
    <View style={[{ padding: spacing.base }, full ? { paddingHorizontal: spacing.lg } : { backgroundColor: colors.surface, borderRadius: radius.card }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Press onPress={openUser} accessibilityLabel={`Open ${name(post.author)}`}>
          <Avatar uri={post.author?.avatar_url} name={name(post.author)} size={36} />
        </Press>
        <Text variant="callout" style={{ flex: 1 }} numberOfLines={2}>
          <Text variant="callout" style={{ fontFamily: fonts.semibold }} onPress={openUser}>
            {name(post.author)}
          </Text>{' '}
          <Text variant="callout" tone="muted">
            {verb(post)}
          </Text>
          {b ? (
            <Text variant="callout" style={{ fontFamily: fonts.medium }}>
              {' '}
              {b.title}
            </Text>
          ) : null}
        </Text>
        <Text variant="caption" tone="faint" style={{ alignSelf: 'flex-start' }}>
          {relativeTime(post.created_at)}
        </Text>
      </View>

      <Press onPress={open} disabled={full} style={{ marginTop: spacing.md }}>
        <Spoiler hidden={post.has_spoilers}>
          {post.kind === 'review' ? (
            <View>
              <Stars value={post.rating ?? post.stars ?? 0} size={14} />
              {post.headline ? (
                <Text variant="bodyStrong" style={{ marginTop: 8 }}>
                  {post.headline}
                </Text>
              ) : null}
              {post.body ? (
                <Text variant="body" style={{ marginTop: 6 }} numberOfLines={full ? undefined : 6}>
                  {post.body}
                </Text>
              ) : null}
            </View>
          ) : post.kind === 'progress' ? (
            <View>
              {post.body ? <Text variant="body">{post.body}</Text> : null}
              {pct !== null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
                  <Progress value={pct} style={{ flex: 1 }} />
                  <Text variant="caption" tone="muted">
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
              ) : null}
            </View>
          ) : post.kind === 'quote' ? (
            <View style={{ borderRadius: radius.tile, backgroundColor: colors.surface2, padding: spacing.base }}>
              <QuotesIcon size={20} weight="fill" color={colors.accent} />
              <Text variant="title" style={{ fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, marginTop: 8 }}>
                {post.quote}
              </Text>
              {post.page ? (
                <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>
                  page {post.page}
                </Text>
              ) : null}
              {post.body ? (
                <Text variant="callout" style={{ marginTop: 8 }}>
                  {post.body}
                </Text>
              ) : null}
            </View>
          ) : post.kind === 'finished' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircleIcon size={18} weight="fill" color={colors.good} />
              <Text variant="callout">{post.days ? `Read in ${post.days} ${post.days === 1 ? 'day' : 'days'}` : 'Finished'}</Text>
              {post.stars ? <Stars value={post.stars} size={13} /> : null}
            </View>
          ) : post.body ? (
            <Text variant="body" numberOfLines={full ? undefined : 8}>
              {post.body}
            </Text>
          ) : null}
        </Spoiler>
      </Press>

      {b ? (
        <Press
          onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.id } })}
          style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.line, padding: spacing.sm }}
        >
          <Cover uri={b.cover_url} title={b.title} author={b.authors} width={36} shadow={false} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="callout" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
              {b.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {b.authors}
            </Text>
          </View>
          {b.avg !== null ? (
            <Text variant="caption" tone="muted" style={{ paddingRight: 4, fontFamily: fonts.medium }}>
              {b.avg.toFixed(1)}
            </Text>
          ) : null}
        </Press>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: -4 }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: liked }}
          onPress={() => {
            const v = !liked;
            setLikedLocal(v);
            setLikes((n) => n + (v ? 1 : -1));
            like.mutate(v);
          }}
          style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: spacing.base }}
        >
          <Animated.View key={String(liked)} entering={liked ? ZoomIn.springify().damping(9) : undefined}>
            <HeartIcon size={21} weight={liked ? 'fill' : 'regular'} color={liked ? colors.accent : colors.muted} />
          </Animated.View>
          <Text variant="small" tone="muted">
            {likes}
          </Text>
        </Press>
        <Press
          accessibilityLabel="Comments"
          onPress={() => (onComment ? onComment() : router.push({ pathname: '/post/[id]', params: { id: post.id, type: post.item_type } }))}
          style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: spacing.base }}
        >
          <ChatCircleIcon size={21} color={colors.muted} />
          <Text variant="small" tone="muted">
            {post.comment_count}
          </Text>
        </Press>
        <Press
          accessibilityLabel="Share"
          onPress={() => void Share.share({ message: `${name(post.author)} on Grimore${b ? ` about ${b.title}` : ''}: ${post.quote ?? post.body ?? ''}`.slice(0, 400) })}
          style={{ height: 36, justifyContent: 'center', paddingRight: spacing.base }}
        >
          <ShareFatIcon size={21} color={colors.muted} />
        </Press>
        <Press
          accessibilityLabel={saved ? 'Remove from saved' : 'Save'}
          onPress={() => {
            setSavedLocal(!saved);
            save.mutate(!saved);
          }}
          style={{ marginLeft: 'auto', height: 36, justifyContent: 'center' }}
        >
          <BookmarkSimpleIcon size={21} weight={saved ? 'fill' : 'regular'} color={saved ? colors.ink : colors.muted} />
        </Press>
      </View>
    </View>
  );
}

/** Rounded input with an avatar and a send button that appears when there is text. */
export function Composer({ placeholder, onSend, busy }: { placeholder: string; onSend: (text: string) => Promise<unknown> | void; busy?: boolean }) {
  const { colors } = useTheme();
  const profile = useMyProfile();
  const [v, setV] = useState('');
  const send = async () => {
    const t = v.trim();
    if (!t) return;
    setV('');
    try {
      await onSend(t);
    } catch (e) {
      setV(t);
      toast(toAppError(e).message);
    }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: 10 }}>
      <Avatar uri={profile.data?.avatar_url} name={profile.data?.display_name} size={32} />
      <View style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, backgroundColor: colors.surface2, paddingLeft: spacing.base, paddingRight: 6 }}>
        <TextInput
          value={v}
          onChangeText={setV}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          accessibilityLabel={placeholder}
          multiline
          maxLength={2000}
          style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 10, maxHeight: 120 }}
        />
        {v.trim() ? (
          <Press onPress={send} disabled={busy} accessibilityLabel="Send" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <PaperPlaneRightIcon size={16} weight="fill" color={colors.onAccent} />
          </Press>
        ) : null}
      </View>
    </View>
  );
}

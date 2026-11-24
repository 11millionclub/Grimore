import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Spoiler } from '@/components/feed';
import { HeartIcon } from '@/components/icons';
import { Avatar, Chip, EmptyState, Progress, Screen, Stagger, Stars, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { ReportButton, ReportedGate } from '@/components/report-button';
import { getBookReviews } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Reviews() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const [f, setF] = useState<'all' | 'friends' | 'five' | 'spoilers'>('all');
  const q = useQuery({ queryKey: ['book', bookId, 'reviews'], queryFn: () => getBookReviews(bookId, me) });
  const d = q.data;
  const max = Math.max(1, ...(d?.dist ?? [1]));
  const list = (d?.list ?? []).filter((r) => (f === 'friends' ? r.friend : f === 'five' ? r.rating === 5 : f === 'spoilers' ? r.has_spoilers : true));
  return (
    <Screen title="Reviews" back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <View style={{ marginHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 44, lineHeight: 46 }}>{d?.avg ? d.avg.toFixed(1) : '—'}</Text>
          <Stars value={d?.avg ?? 0} size={12} />
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
            {d?.count ?? 0}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
          {(d?.dist ?? [0, 0, 0, 0, 0, 0]).map((n, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="micro" tone="muted" style={{ width: 8 }}>
                {6 - i}
              </Text>
              <Progress value={n / max} height={6} style={{ flex: 1 }} />
              <Text variant="micro" tone="muted" style={{ width: 32, textAlign: 'right' }}>
                {d?.count ? Math.round((n / d.count) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.base, gap: spacing.sm }}>
        <Chip active={f === 'all'} onPress={() => setF('all')}>
          All
        </Chip>
        <Chip active={f === 'friends'} onPress={() => setF('friends')}>
          People you follow
        </Chip>
        <Chip active={f === 'five'} onPress={() => setF('five')}>
          5 stars
        </Chip>
        <Chip active={f === 'spoilers'} onPress={() => setF('spoilers')}>
          With spoilers
        </Chip>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {list.length === 0 ? (
          <EmptyState title="No reviews with this filter" />
        ) : (
          list.map((r, i) => (
            <Stagger key={r.id} i={i}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar uri={r.author?.avatar_url} name={r.author?.display_name} size={30} />
                  <Text variant="callout" style={{ fontFamily: fonts.semibold, flex: 1 }} numberOfLines={1}>
                    {r.author?.display_name ?? r.author?.username}
                  </Text>
                  <Stars value={r.rating} size={12} />
                  <ReportButton target={{ reviewId: r.id }} authorId={r.author?.id} size={16} />
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <ReportedGate target={{ reviewId: r.id }}>
                    <Spoiler hidden={r.has_spoilers}>
                      {r.headline ? <Text variant="bodyStrong">{r.headline}</Text> : null}
                      {r.body ? <Text variant="callout">{r.body}</Text> : null}
                    </Spoiler>
                  </ReportedGate>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                  <HeartIcon size={13} color={colors.muted} />
                  <Text variant="caption" tone="muted">
                    {r.like_count}
                  </Text>
                </View>
              </View>
            </Stagger>
          ))
        )}
      </View>
    </Screen>
  );
}

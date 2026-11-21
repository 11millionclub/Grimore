import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityCover, openBook } from '@/components/books';
import { CalendarBlankIcon, CheckIcon, LockSimpleIcon, PlusIcon } from '@/components/icons';
import { Avatar, Btn, Cover, EmptyState, Press, Progress, Screen, SectionHead, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getCommunity, leaveCommunity, listThreads, membersProgress, myMembership, nextEvent } from '@/services/communities';
import { money } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ['community', id], queryFn: () => getCommunity(id) });
  const member = useQuery({ queryKey: ['community', id, 'me'], queryFn: () => myMembership(id, me) });
  const threads = useQuery({ queryKey: ['community', id, 'threads'], queryFn: () => listThreads(id) });
  const event = useQuery({ queryKey: ['community', id, 'event'], queryFn: () => nextEvent(id) });
  const avg = useQuery({ queryKey: ['community', id, 'progress'], queryFn: () => membersProgress(id, c.data!.reading_book_id!), enabled: !!c.data?.reading_book_id });
  const leave = useMutation({
    mutationFn: () => leaveCommunity(id, me),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community', id] });
      void qc.invalidateQueries({ queryKey: ['my-communities'] });
      toast('You left the community');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const d = c.data;
  if (c.isLoading || !d) return <Screen title="" back large={false}><Skeleton height={300} rounded={0} /></Screen>;
  const paid = !!d.price_cents;
  const m = member.data;
  const isHost = m?.role === 'host';
  const paidTier = m && (m.tier === 'circle' || m.tier === 'patron' || isHost);
  const tiers = paid
    ? [
        { name: 'Visitor', price: 0, perks: ['Public posts', 'Reading calendar'] },
        { name: 'Circle', price: d.price_cents!, perks: ['Chapter discussions', 'Monthly live sessions', 'Reading guide'] },
        { name: 'Patron', price: d.price_cents! * 2 + 100, perks: ['Everything in Circle', 'Vote on the next book', 'Exclusive profile frame'] },
      ]
    : null;
  const hero = (
    <View style={{ height: 300 }}>
      <CommunityCover c={d} height={300} />
      <LinearGradient colors={['rgba(0,0,0,0.3)', colors.bg + '4d', colors.bg]} locations={[0, 0.5, 1]} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.md }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, lineHeight: 33 }}>
          {d.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <Avatar uri={d.host?.avatar_url} name={d.host?.display_name} size={22} />
          <Text variant="small">
            by{' '}
            <Text variant="small" style={{ fontFamily: fonts.semibold }} onPress={() => d.host && router.push({ pathname: '/user/[username]', params: { username: d.host.username } })}>
              {d.host?.display_name ?? d.host?.username}
            </Text>
          </Text>
          <Text variant="small" tone="muted">
            · {d.member_count} members
          </Text>
        </View>
      </View>
    </View>
  );
  const footer = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      {m ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Btn size="lg" style={{ flex: 1 }} icon={<PlusIcon size={18} weight="bold" color={colors.onAccent} />} onPress={() => router.push({ pathname: '/thread/new/[communityId]', params: { communityId: id } })}>
            New discussion
          </Btn>
          {!isHost ? (
            <Btn
              size="lg"
              variant="secondary"
              icon={<CheckIcon size={18} weight="bold" color={colors.ink} />}
              onPress={() => Alert.alert(`Leave ${d.name}?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => leave.mutate() }])}
            >
              Joined
            </Btn>
          ) : null}
        </View>
      ) : (
        <Btn size="lg" full onPress={() => router.push({ pathname: '/community/join/[id]', params: { id } })}>
          {paid ? `Join · from ${money(d.price_cents)}/month` : 'Join the community'}
        </Btn>
      )}
    </View>
  );
  return (
    <Screen title={d.name} large={false} back hero={hero} barTransparent footer={footer} refreshing={threads.isRefetching} onRefresh={() => Promise.all([c.refetch(), threads.refetch(), event.refetch()])}>
      {d.tagline || d.description ? (
        <Text variant="body" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, opacity: 0.9 }}>
          {d.description ?? d.tagline}
        </Text>
      ) : null}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md }}>
        {d.reading ? (
          <Press onPress={() => openBook(d.reading!.id)} style={{ flexDirection: 'row', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <Cover uri={d.reading.cover_url} title={d.reading.title} author={d.reading.authors} width={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="caption" tone="accent" style={{ fontFamily: fonts.semibold }}>
                Reading now
              </Text>
              <Text variant="title" numberOfLines={1}>
                {d.reading.title}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {d.reading_note ?? d.reading.authors}
              </Text>
              {avg.data !== null && avg.data !== undefined ? (
                <>
                  <Progress value={avg.data} style={{ marginTop: spacing.md }} />
                  <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
                    Members are {Math.round(avg.data * 100)}% in, on average
                  </Text>
                </>
              ) : null}
            </View>
          </Press>
        ) : null}
        {event.data ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="micro" tone="accent">
                {new Date(event.data.starts_at).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
              </Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 18 }}>{new Date(event.data.starts_at).getDate()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{event.data.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CalendarBlankIcon size={13} color={colors.muted} />
                <Text variant="small" tone="muted">
                  {new Date(event.data.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {event.data.format.replace('_', ' ')} · {event.data.members_only ? 'members' : 'open'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {tiers ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Membership tiers" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {tiers.map((t, i) => (
              <View key={t.name} style={{ width: 220, borderRadius: radius.card, padding: spacing.base, backgroundColor: i === 1 ? colors.ink : colors.surface }}>
                <Text variant="callout" style={{ fontFamily: fonts.semibold }} color={i === 1 ? colors.bg : colors.ink}>
                  {t.name}
                </Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 28, marginTop: 4 }} color={i === 1 ? colors.bg : colors.ink}>
                  {t.price ? money(t.price) : 'Free'}
                  {t.price ? <Text variant="small" color={i === 1 ? colors.bg : colors.muted}> /month</Text> : null}
                </Text>
                <View style={{ marginTop: spacing.md, gap: 6 }}>
                  {t.perks.map((p) => (
                    <View key={p} style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <CheckIcon size={14} weight="bold" color={colors.accent} style={{ marginTop: 2 }} />
                      <Text variant="small" color={i === 1 ? colors.bg : colors.ink}>
                        {p}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title="Discussion" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {(threads.data ?? []).length === 0 ? <EmptyState title="No discussions yet" body={m ? 'Start the first one.' : 'Join to start the first one.'} /> : null}
          {(threads.data ?? []).map((t) => (
            <Press key={t.id} onPress={() => router.push({ pathname: '/thread/[id]', params: { id: t.id } })} style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={t.author?.avatar_url} name={t.author?.display_name} size={22} />
                <Text variant="small" style={{ fontFamily: fonts.semibold, flex: 1 }} numberOfLines={1}>
                  {t.author?.display_name ?? t.author?.username}
                </Text>
                {t.is_pinned ? (
                  <Text variant="micro" tone="accent">
                    Pinned
                  </Text>
                ) : null}
                <Text variant="caption" tone="faint">
                  {relativeTime(t.created_at)}
                </Text>
              </View>
              <Text variant="title" style={{ marginTop: spacing.sm }}>
                {t.title}
              </Text>
              {t.body ? (
                <Text variant="callout" tone="muted" numberOfLines={2} style={{ marginTop: 4 }}>
                  {t.has_spoilers ? 'Contains spoilers' : t.body}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, fontFamily: fonts.medium }}>
                {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}
              </Text>
            </Press>
          ))}
          {paid && !paidTier ? (
            <View style={{ overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
              <LockSimpleIcon size={20} weight="bold" color={colors.muted} />
              <Text variant="callout" tone="muted" align="center">
                Members-only discussions, live session recordings and guides are for Circle members.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ height: insets.bottom }} />
    </Screen>
  );
}

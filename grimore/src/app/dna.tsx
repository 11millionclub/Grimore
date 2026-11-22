import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CommunityCover, openCommunity } from '@/components/books';
import { ArrowRightIcon } from '@/components/icons';
import { ARCH_ICONS } from '@/components/onboarding-flow';
import { Avatar, Btn, Press, Progress, Screen, SectionHead, Text } from '@/components/ui';
import { useMyId, useProfile, useReadingStats } from '@/hooks/queries';
import { suggestedCommunities } from '@/services/communities';
import { suggestReaders } from '@/services/profile';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { ARCHETYPES, type Arch } from '@/utils/archetypes';

const TRAITS: { name: string; moods: string[] }[] = [
  { name: 'Dark or mysterious', moods: ['dark', 'mysterious', 'atmospheric', 'tense'] },
  { name: 'Lyrical and reflective', moods: ['reflective', 'dreamy', 'emotional', 'character-driven'] },
  { name: 'Fast-paced', moods: ['fast-paced', 'adventurous', 'tense', 'epic'] },
  { name: 'Romantic or cosy', moods: ['romantic', 'cosy', 'heartwarming', 'witty'] },
];

export default function ReaderDNA() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const uid = params.userId ?? me;
  const isMe = uid === me;
  const profile = useProfile(uid);
  const stats = useReadingStats(uid);
  const comms = useQuery({ queryKey: ['communities', 'suggested'], queryFn: () => suggestedCommunities(6), enabled: isMe });
  const arch = (profile.data?.archetype ?? null) as Arch | null;
  const twins = useQuery({ queryKey: ['readers', 'twins', arch], queryFn: () => suggestReaders(me, arch, 6), enabled: isMe && !!arch });
  const s = stats.data;
  const moodCounts = new Map((s?.moods ?? []).map((m) => [m.name, m.n]));
  const totalMoods = Math.max(1, [...moodCounts.values()].reduce((a, b) => a + b, 0));
  const traits = TRAITS.map((t) => ({ name: t.name, v: Math.min(1, (t.moods.reduce((a, m) => a + (moodCounts.get(m) ?? 0), 0) / totalMoods) * 1.8) }));
  const Icon = arch ? ARCH_ICONS[arch] : ARCH_ICONS.night;
  const parts = s
    ? [
        s.lateShare > 0.4 ? 'you read mostly at night' : s.peakHour !== null ? `you read most around ${s.peakHour}:00` : null,
        s.idealPages ? `your sweet spot is about ${s.idealPages} pages` : null,
        s.genres[0] ? `you keep coming back to ${s.genres[0].name.toLowerCase()}` : null,
      ].filter((p): p is string => !!p)
    : [];
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
  const tried = s ? s.totalRead + s.dnf : 0;
  const giveUp = !s || !tried ? '' : s.dnf / tried < 0.15 ? `You rarely give up: ${s.dnf} set aside out of ${tried}.` : `You have set aside ${s.dnf} of ${tried}.`;
  const summary = [joined ? `${joined[0].toUpperCase()}${joined.slice(1)}.` : '', giveUp].filter(Boolean).join(' ');
  return (
    <Screen title="Reader DNA" back large={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.xl }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -70, top: -70, width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: colors.gold, opacity: 0.35 }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: colors.gold, opacity: 0.25 }} />
          <Icon size={34} weight="fill" color={colors.accent} />
          <Text variant="small" tone="muted" style={{ marginTop: spacing.base }}>
            {isMe ? 'You are a' : `${(profile.data?.display_name ?? profile.data?.username ?? '').split(' ')[0]} is a`}
          </Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 39, lineHeight: 42 }}>
            {arch ? ARCHETYPES[arch].name : 'Reader in the making'}
          </Text>
          <Text variant="body" style={{ marginTop: spacing.sm, opacity: 0.85 }}>
            {arch ? ARCHETYPES[arch].line : 'Take the reader test to find out.'} {summary}
          </Text>
        </View>
        <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.md }}>
          {[
            [s?.peakHour !== null && s?.peakHour !== undefined ? `${s.peakHour}:00` : '—', 'favourite hour'],
            [s?.idealPages ? String(s.idealPages) : '—', 'ideal pages'],
            [s?.daysPerBook ? `${s.daysPerBook} days` : '—', 'per book'],
          ].map(([v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 20 }}>{v}</Text>
              <Text variant="caption" tone="muted">
                {l}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <Text variant="bodyStrong">What you look for in a book</Text>
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {traits.map((t) => (
              <View key={t.name}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text variant="small">{t.name}</Text>
                  <Text variant="small" tone="muted">
                    {Math.round(t.v * 100)}%
                  </Text>
                </View>
                <Progress value={t.v} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {isMe && (comms.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Communities for you" />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {(comms.data ?? []).slice(0, 4).map((c) => (
              <Press key={c.id} onPress={() => openCommunity(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <CommunityCover c={c} height={48} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {c.price_cents ? 'Membership tiers' : 'Free'}
                  </Text>
                </View>
                <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
                  {c.match}%
                </Text>
              </Press>
            ))}
          </View>
        </View>
      ) : null}

      {isMe && (twins.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Readers with the same profile" />
          <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg }}>
            {(twins.data ?? []).map((u, i) => (
              <Press key={u.id} onPress={() => router.push({ pathname: '/user/[username]', params: { username: u.username } })} style={{ marginLeft: i ? -10 : 0, borderRadius: 20, borderWidth: 2, borderColor: colors.bg }}>
                <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={36} />
              </Press>
            ))}
          </View>
        </View>
      ) : null}

      {isMe ? (
        <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
          <Btn variant="ghost" full icon={<ArrowRightIcon size={16} color={colors.ink} />} onPress={() => router.push('/quiz')}>
            Retake the test (2 min)
          </Btn>
        </View>
      ) : null}
    </Screen>
  );
}

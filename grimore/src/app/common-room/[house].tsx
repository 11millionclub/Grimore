import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CaretRightIcon, ChatsCircleIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Toggle } from '@/components/switch';
import { Avatar, Press, Progress, Screen, SectionHead, Text, toast } from '@/components/ui';
import { useMyHouse, useMyId, usePreferences } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { houseRoom, myWeekGames, setLeaderboardOptIn, topContributors } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_NAMES, type HouseId, isHouseId, themedHouse } from '@/theme/houses';

type Quest = { key: 'solve5' | 'play8' | 'hangman3' | 'timeline2'; target: number; count: (g: { game: string; played: number; solved: number }[]) => number };
const QUESTS: Quest[] = [
  { key: 'solve5', target: 5, count: (g) => g.reduce((a, x) => a + x.solved, 0) },
  { key: 'play8', target: 8, count: (g) => g.reduce((a, x) => a + x.played, 0) },
  { key: 'hangman3', target: 3, count: (g) => g.find((x) => x.game === 'hangman')?.solved ?? 0 },
  { key: 'timeline2', target: 2, count: (g) => g.find((x) => x.game === 'timeline')?.solved ?? 0 },
];
const weekIndex = (ms: number) => Math.floor((ms / 86_400_000 + 3) / 7);

/** A House's Common Room: ritual, weekly quest, opt-in top contributors and the House discussions. */
export default function CommonRoom() {
  const params = useLocalSearchParams<{ house: string }>();
  const house: HouseId = isHouseId(params.house) ? params.house : 'wanderers';
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const { t } = useTranslation();
  const me = useMyId()!;
  const qc = useQueryClient();
  const mine = useMyHouse();
  const member = mine.data?.house === house;
  const tk = themedHouse(house, dark);
  const [now] = useState(() => Date.now());
  const quest = QUESTS[weekIndex(now) % QUESTS.length];
  const room = useQuery({ queryKey: ['houseRoom', house], queryFn: () => houseRoom(house) });
  const week = useQuery({ queryKey: ['myWeekGames'], queryFn: myWeekGames, enabled: member });
  const top = useQuery({ queryKey: ['topContributors', house], queryFn: () => topContributors(house) });
  const prefs = usePreferences();
  const optIn = useMutation({
    mutationFn: (v: boolean) => setLeaderboardOptIn(me, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['topContributors'] });
      void prefs.refetch();
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const progress = quest.count(week.data ?? []);

  return (
    <Screen title={t('room.title', { house: HOUSE_NAMES[house] })} back large={false} refreshing={top.isRefetching} onRefresh={() => Promise.all([top.refetch(), week.refetch()])}>
      <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.card, backgroundColor: tk.primary, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
        <Sigil house={house} size={56} color={tk.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 28 }} color={tk.onPrimary}>
            {HOUSE_NAMES[house]}
          </Text>
          <Text variant="small" color={tk.onPrimary} style={{ fontStyle: 'italic' }}>
            {t(`houses.${house}.motto`)}
          </Text>
          {room.data ? (
            <Text variant="caption" color={tk.onPrimary}>
              {room.data.member_count} {t(`houses.${house}.members`)}
            </Text>
          ) : null}
        </View>
      </View>

      <Press
        onPress={() => (member ? router.push('/house') : undefined)}
        style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: tk.ink, padding: spacing.base }}
      >
        <Text variant="micro" tone="muted">
          {(house === 'luminaries' ? t('house.ritualWeek') : t('house.ritualTitle')).toUpperCase()}
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 21, marginTop: 2 }} color={tk.ink}>
          {t(`houses.${house}.ritual`)}
        </Text>
        <Text variant="callout">{t(`houses.${house}.ritualDesc`)}</Text>
      </Press>

      {member ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title={t('room.quest')} />
          <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base, gap: spacing.sm }}>
            <Text variant="bodyStrong">{t(`room.quests.${quest.key}`)}</Text>
            <Progress value={Math.min(1, progress / quest.target)} color={tk.primary} height={8} />
            <Text variant="caption" tone="muted">
              {t('room.progress', { n: Math.min(progress, quest.target), target: quest.target })}
            </Text>
          </View>
        </View>
      ) : (
        <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          {t('room.noHouse', { house: HOUSE_NAMES[house] })}
        </Text>
      )}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title={t('room.top')} />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {(top.data ?? []).length ? (
            (top.data ?? []).map((u, i) => (
              <Press key={u.user_id} onPress={() => router.push({ pathname: '/user/[username]', params: { username: u.username } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text style={{ fontFamily: fonts.display, width: 20 }} tone={i === 0 ? 'accent' : 'muted'}>
                  {i + 1}
                </Text>
                <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={36} />
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {u.display_name ?? u.username}
                </Text>
                <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                  {u.points}
                </Text>
              </Press>
            ))
          ) : (
            <Text variant="callout" tone="muted">
              {t('room.noTop')}
            </Text>
          )}
          <Text variant="caption" tone="muted">
            {t('room.topHint')}
          </Text>
          {member ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs }}>
              <Text variant="callout" style={{ flex: 1 }}>
                {t('room.optIn')}
              </Text>
              <Toggle value={!!prefs.data?.house_leaderboard_opt_in} onChange={(v) => optIn.mutate(v)} label={t('room.optIn')} />
            </View>
          ) : null}
        </View>
      </View>

      {room.data ? (
        <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
          <Press
            onPress={() => router.push({ pathname: '/community/[id]', params: { id: room.data!.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base }}
          >
            <ChatsCircleIcon size={22} color={tk.ink} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('room.discuss')}</Text>
              <Text variant="caption" tone="muted">
                {t('room.open')}
              </Text>
            </View>
            <CaretRightIcon size={14} color={colors.muted} />
          </Press>
        </View>
      ) : null}
    </Screen>
  );
}

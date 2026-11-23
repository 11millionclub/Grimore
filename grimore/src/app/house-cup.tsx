import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CaretRightIcon } from '@/components/icons';
import { PointsLink } from '@/components/house-cup-card';
import { Sigil } from '@/components/sigil';
import { Press, Screen, SectionHead, Skeleton, Text } from '@/components/ui';
import { useMyHouse } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { getDuels, getStandings, listSeasons, myPoints } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_NAMES, houseTokens, type HouseId } from '@/theme/houses';

const ROWS: [string, string][] = [
  ['play', '10'],
  ['solve', '+10'],
  ['placement', '+15 / +10 / +5'],
  ['all_four', '+15'],
  ['streak', '+2'],
  ['duel', '+50'],
];

/** The House Cup: season standings by points per active member, this week's duels and your contribution. */
export default function HouseCup() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const mine = useMyHouse();
  const h = mine.data?.house ?? null;
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: listSeasons });
  const standings = useQuery({ queryKey: ['standings'], queryFn: () => getStandings(), refetchInterval: 30_000 });
  const duels = useQuery({ queryKey: ['duels'], queryFn: getDuels });
  const points = useQuery({ queryKey: ['myHousePoints'], queryFn: () => myPoints(), enabled: !!h });
  const [now] = useState(() => Date.now());

  const list = seasons.data ?? [];
  const current = list.find((s) => new Date(s.starts_at).getTime() <= now && now < new Date(s.ends_at).getTime());
  const upcoming = list.find((s) => new Date(s.starts_at).getTime() > now);
  const justEnded = [...list].reverse().find((s) => s.winner_house_id && new Date(s.ends_at).getTime() <= now && now < new Date(s.ends_at).getTime() + 7 * 86_400_000);
  const daysTo = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
  const header = current
    ? t('cup.season', { name: current.name, days: daysTo(current.ends_at) })
    : upcoming
      ? t('cup.seasonStarts', { name: upcoming.name, days: daysTo(upcoming.starts_at) })
      : '';
  const rows = standings.data ?? [];
  const top = rows[0]?.perMember ?? 0;
  const total = Object.values(points.data ?? {}).reduce((a, b) => a + b, 0);
  const duelPairs: [HouseId, HouseId][] = [
    ['lantern', 'hourglass'],
    ['quill', 'thorn'],
  ];

  return (
    <Screen title={t('cup.title')} back refreshing={standings.isRefetching} onRefresh={() => Promise.all([standings.refetch(), duels.refetch(), points.refetch(), seasons.refetch()])}>
      <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.sm, marginBottom: spacing.md }}>
        {header}
      </Text>

      {justEnded?.winner_house_id ? (
        <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.card, backgroundColor: houseTokens[justEnded.winner_house_id].primary, padding: spacing.base, flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Sigil house={justEnded.winner_house_id} size={44} color={houseTokens[justEnded.winner_house_id].onPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 21 }} color={houseTokens[justEnded.winner_house_id].onPrimary}>
              {t('cup.winner', { house: HOUSE_NAMES[justEnded.winner_house_id], season: justEnded.name })}
            </Text>
            <Text variant="small" color={houseTokens[justEnded.winner_house_id].onPrimary}>
              {t('cup.winnerBody', { member: t(`houses.${justEnded.winner_house_id}.member`) })}
            </Text>
          </View>
        </View>
      ) : null}

      <SectionHead title={t('cup.standings')} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {standings.isLoading
          ? [0, 1, 2, 3].map((k) => <Skeleton key={k} height={64} rounded={radius.card} />)
          : rows.map((r, i) => {
              const tk = houseTokens[r.house];
              const me = r.house === h;
              return (
                <Press
                  key={r.house}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}. ${HOUSE_NAMES[r.house]}, ${t('cup.perMember', { n: r.perMember })}`}
                  onPress={() => router.push({ pathname: '/common-room/[house]', params: { house: r.house } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: me ? 2 : 1, borderColor: me ? tk.ink : colors.line, padding: spacing.md }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, width: 20, fontVariant: ['tabular-nums'] }} tone={i === 0 ? 'accent' : 'muted'}>
                    {i + 1}
                  </Text>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Sigil house={r.house} size={24} color={tk.onPrimary} label={false} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 19 }} color={tk.ink}>
                      {HOUSE_NAMES[r.house]}
                    </Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${top ? Math.max(4, (r.perMember / top) * 100) : 4}%`, height: '100%', backgroundColor: tk.primary }} />
                    </View>
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {t('cup.perMember', { n: r.perMember })} · {t('cup.active', { n: r.activeMembers })}
                    </Text>
                  </View>
                  <CaretRightIcon size={14} color={colors.muted} />
                </Press>
              );
            })}
        <Text variant="caption" tone="muted">
          {t('cup.fairness')}
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title={t('cup.duel')} />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {duelPairs.map(([a, b]) => {
            const da = duels.data?.[a]?.perMember ?? 0;
            const db = duels.data?.[b]?.perMember ?? 0;
            const share = da + db ? da / (da + db) : 0.5;
            return (
              <View key={a} style={{ backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sigil house={a} size={18} color={houseTokens[a].ink} label={false} />
                    <Text variant="bodyStrong">{HOUSE_NAMES[a]}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="bodyStrong">{HOUSE_NAMES[b]}</Text>
                    <Sigil house={b} size={18} color={houseTokens[b].ink} label={false} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: spacing.sm }}>
                  <View style={{ flex: share, backgroundColor: houseTokens[a].primary }} />
                  <View style={{ flex: 1 - share, backgroundColor: houseTokens[b].primary }} />
                </View>
                <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {t('cup.duelLine', { a: HOUSE_NAMES[a], pa: `${Math.round(share * 100)} %`, b: HOUSE_NAMES[b], pb: `${100 - Math.round(share * 100)} %` })}
                </Text>
              </View>
            );
          })}
          <Text variant="caption" tone="muted">
            {t('cup.duelHint')}
          </Text>
        </View>
      </View>

      {h ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title={t('cup.you')} />
          <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: houseTokens[h].ink, padding: spacing.base }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20 }} color={houseTokens[h].ink}>
              {t('cup.yourPoints', { n: total, house: HOUSE_NAMES[h] })}
            </Text>
            {ROWS.filter(([k]) => k !== 'duel' && points.data?.[k]).map(([k]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text variant="small" tone="muted">
                  {t(`cup.rows.${k}`)}
                </Text>
                <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                  {points.data?.[k]}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
            <PointsLink />
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title={t('cup.howTitle')} />
        <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base, gap: 6 }}>
          <Text variant="small">{t('cup.howBody')}</Text>
          {ROWS.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text variant="small" tone="muted" style={{ flex: 1 }}>
                {t(`cup.rows.${k}`)}
              </Text>
              <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                {v}
              </Text>
            </View>
          ))}
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
            {t('cup.cap')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

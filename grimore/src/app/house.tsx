import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { ReaderMarks } from '@/components/house-badge';
import { CaretRightIcon, TrophyIcon, UsersThreeIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Toggle } from '@/components/switch';
import { Btn, Press, Row, Group, Screen, SectionHead, Text, toast } from '@/components/ui';
import { useMyHouse, useMyId } from '@/hooks/queries';
import { clearHouseCache } from '@/hooks/use-house-of';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { changeHouse, completeRitual, joinRitual, latestSorting, listSeasons, myItems, myRitual, setHouseHidden } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, HOUSE_RIVALS, houseTokens, type HouseId } from '@/theme/houses';
import { breakdown } from '@/utils/sorting';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

/** Your House: who you are, why you were sorted here, the ritual, your marks, and the change rules. */
export default function HouseScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const me = useMyId()!;
  const qc = useQueryClient();
  const mine = useMyHouse();
  const h = mine.data?.house ?? null;
  const sorting = useQuery({ queryKey: ['sorting', me], queryFn: () => latestSorting(me) });
  const ritual = useQuery({ queryKey: ['ritual', me], queryFn: myRitual, enabled: !!h });
  const items = useQuery({ queryKey: ['myItems', me], queryFn: () => myItems(me) });
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: listSeasons });
  const [openedAt] = useState(() => Date.now());

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['myHouse'] }), qc.invalidateQueries({ queryKey: ['ritual'] }), qc.invalidateQueries({ queryKey: ['myItems'] })]);
  const ritualMut = useMutation({
    mutationFn: async (step: 'join' | 'complete') => {
      if (step === 'join') {
        await joinRitual();
        track('ritual_joined', { house: h });
      } else await completeRitual();
    },
    onSuccess: refresh,
    onError: (e) => toast(toAppError(e).message),
  });
  const hide = useMutation({
    mutationFn: (v: boolean) => setHouseHidden(me, v),
    onSuccess: (_d, v) => {
      track('house_hidden_toggled', { hidden: v });
      void refresh();
      void qc.invalidateQueries({ queryKey: ['readerHouses'] });
      clearHouseCache();
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const change = useMutation({
    mutationFn: (to: HouseId) => changeHouse(to),
    onSuccess: (_d, to) => {
      track('house_changed', { to, when: 'season_window' });
      void refresh();
      toast(t('sorting.welcomeCard.title', { house: HOUSE_NAMES[to] }));
    },
    onError: (e) => toast(toAppError(e).message),
  });

  if (!h) return <Screen title={t('house.title')} back><View /></Screen>;
  const tk = houseTokens[h];
  const rows = sorting.data && !Object.values(sorting.data.scores ?? {}).every((v) => !v) ? breakdown(sorting.data.scores) : [];
  const about = t(`houses.${h}.about`, { returnObjects: true }) as unknown as string[];
  const marks = (items.data ?? []).filter((x) => !x.expires_at || new Date(x.expires_at).getTime() > openedAt).map((x) => x.item_key);

  const list = seasons.data ?? [];
  const current = list.find((s) => new Date(s.starts_at).getTime() <= openedAt && openedAt < new Date(s.ends_at).getTime()) ?? list.find((s) => new Date(s.starts_at).getTime() > openedAt) ?? null;
  const window = list.find((s) => new Date(s.ends_at).getTime() <= openedAt && openedAt < new Date(s.ends_at).getTime() + 7 * 86_400_000) ?? null;

  const askChange = (to: HouseId) => {
    const msg = t('house.changeConfirm', { house: HOUSE_NAMES[to] });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) change.mutate(to);
      return;
    }
    Alert.alert(t('house.change'), msg, [
      { text: t('common.back'), style: 'cancel' },
      { text: t('sorting.choose.join', { house: HOUSE_NAMES[to] }), onPress: () => change.mutate(to) },
    ]);
  };

  return (
    <Screen title={t('house.title')} back large={false} refreshing={mine.isRefetching} onRefresh={refresh}>
      <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.card, backgroundColor: tk.primary, padding: spacing.xl, alignItems: 'center' }}>
        <Sigil house={h} size={84} color={tk.onPrimary} />
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 40, marginTop: spacing.md }} color={tk.onPrimary}>
          {HOUSE_NAMES[h]}
        </Text>
        <Text variant="title" color={tk.onPrimary}>
          {t(`houses.${h}.members`)}
        </Text>
        <Text variant="quote" align="center" color={tk.onPrimary} style={{ marginTop: spacing.sm }}>
          “{t(`houses.${h}.motto`)}”
        </Text>
        <Text variant="small" color={tk.onPrimary} style={{ marginTop: spacing.sm }}>
          {t('house.readsFor', { what: t(`houses.${h}.readsFor`) })} · {t('house.rival', { house: HOUSE_NAMES[HOUSE_RIVALS[h]] })}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm }}>
        {about.map((line) => (
          <Text key={line} variant="body">
            {line}
          </Text>
        ))}
        <Text variant="small" tone="muted">
          <Text variant="small" style={{ fontFamily: fonts.semibold }}>
            {t('house.strength')}:
          </Text>{' '}
          {t(`houses.${h}.strength`)}{'  '}
          <Text variant="small" style={{ fontFamily: fonts.semibold }}>
            {t('house.shadow')}:
          </Text>{' '}
          {t(`houses.${h}.shadow`)}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
        <Press onPress={() => router.push({ pathname: '/common-room/[house]', params: { house: h } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base }}>
          <UsersThreeIcon size={20} color={tk.ink} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {t('house.commonRoom')}
          </Text>
          <CaretRightIcon size={14} color={colors.muted} />
        </Press>
        <Press
          onPress={() => {
            track('house_cup_viewed', { from: 'house' });
            router.push('/house-cup');
          }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base }}
        >
          <TrophyIcon size={20} color={tk.ink} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {t('house.cup')}
          </Text>
          <CaretRightIcon size={14} color={colors.muted} />
        </Press>
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title={h === 'quill' ? t('house.ritualWeek') : t('house.ritualTitle')} />
        <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: tk.ink, padding: spacing.base, gap: spacing.sm }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 18 }} color={tk.ink}>
            {t(`houses.${h}.ritual`)}
          </Text>
          <Text variant="callout">{t(`houses.${h}.ritualDesc`)}</Text>
          {ritual.data?.status === 'completed' ? (
            <Text variant="small" tone="good" style={{ fontFamily: fonts.semibold }}>
              {t('house.completed')}
            </Text>
          ) : ritual.data?.status === 'joined' ? (
            <>
              <Text variant="small" tone="muted">
                {t('house.joined')}
              </Text>
              <Btn size="md" loading={ritualMut.isPending} onPress={() => ritualMut.mutate('complete')}>
                {t('house.complete')}
              </Btn>
            </>
          ) : (
            <Btn size="md" loading={ritualMut.isPending} onPress={() => ritualMut.mutate('join')}>
              {t('house.join')}
            </Btn>
          )}
          <Text variant="caption" tone="muted">
            {t('house.honour')}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHead title={t('house.marks')} />
        <View style={{ paddingHorizontal: spacing.lg }}>
          {marks.length ? <ReaderMarks keys={marks} size={30} /> : <Text variant="callout" tone="muted">{t('house.noMarks')}</Text>}
        </View>
      </View>

      {rows.length || sorting.data ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title={t('house.why')} />
          <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
            {rows.length ? (
              <>
                <Text variant="small">{t('sorting.reveal.breakdown', { list: rows.map((r) => `${r.pct} % ${HOUSE_NAMES[r.house]}`).join(', ') })}</Text>
                {rows.map((r) => (
                  <View key={r.house} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Sigil house={r.house} size={16} color={houseTokens[r.house].ink} label={false} />
                    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
                      <View style={{ width: `${r.pct}%`, height: '100%', backgroundColor: houseTokens[r.house].primary }} />
                    </View>
                    <Text variant="caption" style={{ width: 92 }}>
                      {r.pct} % {HOUSE_NAMES[r.house]}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text variant="callout" tone="muted">
                {t('house.chosen')}
              </Text>
            )}
          </View>
        </View>
      ) : null}

      <Group title={t('settings.privacy')}>
        <Row label={t('house.hide')} right={<Toggle value={!!mine.data?.hidden} onChange={(v) => hide.mutate(v)} label={t('house.hide')} />} last />
      </Group>
      <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.lg + spacing.xs, marginTop: spacing.sm }}>
        {t('house.hideHint')}
      </Text>

      <Group title={t('house.change')}>
        {window ? (
          HOUSE_IDS.filter((x) => x !== h).map((x, i, a) => (
            <Row key={x} icon={<Sigil house={x} size={20} color={houseTokens[x].ink} label={false} />} label={t('sorting.choose.join', { house: HOUSE_NAMES[x] })} onPress={() => askChange(x)} right={<CaretRightIcon size={14} color={colors.muted} />} last={i === a.length - 1} />
          ))
        ) : (
          <Row label={current ? t('house.changeLocked', { date: day(current.ends_at) }) : t('house.changeUsed')} last />
        )}
      </Group>
      {window ? (
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.lg + spacing.xs, marginTop: spacing.sm }}>
          {t('house.changeOpen', { date: day(new Date(new Date(window.ends_at).getTime() + 7 * 86_400_000).toISOString()) })}
        </Text>
      ) : null}
    </Screen>
  );
}

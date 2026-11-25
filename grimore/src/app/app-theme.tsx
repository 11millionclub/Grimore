import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { CheckIcon, LockSimpleIcon } from '@/components/icons';
import { Press, Screen, Text, toast } from '@/components/ui';
import { useMyId, usePaywalls } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getPurchases } from '@/services/corner';
import { myItems } from '@/services/houses';
import { updatePreferences } from '@/services/profile';
import { APP_THEMES, fonts, radius, spacing, useAppTheme, useTheme, type AppTheme } from '@/theme';

/** A small picture of the theme: page, card, button and text in its colours. */
function Swatch({ t }: { t: AppTheme }) {
  const c = t.colors;
  return (
    <View style={{ height: 104, borderRadius: radius.tile, backgroundColor: c.bg, padding: 10, gap: 6, borderWidth: 1, borderColor: c.line }}>
      <View style={{ height: 10, width: '60%', borderRadius: 5, backgroundColor: c.ink, opacity: 0.85 }} />
      <View style={{ flex: 1, borderRadius: 8, backgroundColor: c.surface, padding: 6, gap: 4 }}>
        <View style={{ height: 6, width: '80%', borderRadius: 3, backgroundColor: c.muted, opacity: 0.6 }} />
        <View style={{ height: 6, width: '50%', borderRadius: 3, backgroundColor: c.muted, opacity: 0.4 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ height: 14, flex: 1, borderRadius: 7, backgroundColor: c.accent }} />
        <View style={{ height: 14, width: 14, borderRadius: 7, backgroundColor: c.gold }} />
      </View>
    </View>
  );
}

/** Colour themes for the whole app: four free, five to unlock (all open while paywalls are off). */
export default function AppThemeScreen() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const current = useAppTheme((s) => s.id);
  const setTheme = useAppTheme((s) => s.set);
  const paywalls = usePaywalls();
  const items = useQuery({ queryKey: ['myItems', me], queryFn: () => myItems(me) });
  const bought = useQuery({ queryKey: ['purchases', me], queryFn: () => getPurchases(me) });
  const owns = (t: AppTheme) => !paywalls || !t.paid || (items.data ?? []).some((x) => x.item_key === `apptheme:${t.id}`) || (bought.data ?? []).includes(`apptheme:${t.id}`);

  const save = useMutation({
    mutationFn: (t: AppTheme) => updatePreferences(me, { app_theme: t.id }),
    onMutate: (t) => {
      const before = current;
      setTheme(t.id);
      return { before };
    },
    onSuccess: (_d, t) => {
      void qc.invalidateQueries({ queryKey: qk.preferences });
      toast(`${t.name} theme on`);
    },
    onError: (e, _t, ctx) => {
      if (ctx) setTheme(ctx.before);
      toast(toAppError(e).message);
    },
  });

  const pick = (t: AppTheme) => {
    if (owns(t)) {
      if (t.id !== current) save.mutate(t);
      return;
    }
    toast(`Unlock ${t.name} with points`);
    router.push('/points');
  };

  const section = (title: string, list: AppTheme[]) => (
    <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
      <Text variant="h2" style={{ paddingHorizontal: spacing.lg }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg }}>
        {list.map((t) => {
          const on = t.id === current;
          const open = owns(t);
          return (
            <Press key={t.id} accessibilityLabel={`${t.name}${on ? ', in use' : open ? '' : ', locked'}`} accessibilityState={{ selected: on }} onPress={() => pick(t)} style={{ width: '47%', gap: 6 }}>
              <View style={{ borderRadius: radius.tile + 2, borderWidth: 2, borderColor: on ? colors.gold : 'transparent', padding: 2 }}>
                <Swatch t={t} />
                {!open ? (
                  <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                    <LockSimpleIcon size={14} weight="fill" color="#fff" />
                  </View>
                ) : on ? (
                  <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={14} weight="bold" color="#fff" />
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 14 }}>{t.name}</Text>
              <Text variant="caption" tone="muted">
                {t.scheme === 'dark' ? 'Dark' : 'Light'}
                {t.paid ? (paywalls ? (open ? ' · Unlocked' : ' · 600 points') : ' · Free while testing') : ' · Free'}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen title="App theme" back>
      {section('Free', APP_THEMES.filter((t) => !t.paid))}
      {section('Premium', APP_THEMES.filter((t) => t.paid))}
    </Screen>
  );
}

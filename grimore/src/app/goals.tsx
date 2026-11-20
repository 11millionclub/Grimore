import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MinusIcon, PlusIcon } from '@/components/icons';
import { Btn, IconBtn, Progress, Screen, Slider, Text, toast } from '@/components/ui';
import { useMyId, usePreferences, useReadingGoal } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { setGoal } from '@/services/library';
import { updatePreferences } from '@/services/profile';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Goals() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const goal = useReadingGoal(me);
  const prefs = usePreferences();
  const [target, setTarget] = useState<number | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const t = target ?? goal.data?.target ?? 24;
  const p = pages ?? prefs.data?.daily_pages_goal ?? 20;
  const read = goal.data?.read ?? 0;
  const [now] = useState(() => Date.now());
  const weeksLeft = Math.max(1, Math.ceil((new Date(year + 1, 0, 1).getTime() - now) / (7 * 86_400_000)));
  const save = useMutation({
    mutationFn: async () => {
      await setGoal(me, year, t);
      await updatePreferences(me, { daily_pages_goal: p });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.goal(me, year) });
      void qc.invalidateQueries({ queryKey: qk.preferences });
      void qc.invalidateQueries({ queryKey: ['streak'] });
      router.back();
      toast('Goals updated');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const card = { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg } as const;
  return (
    <Screen title="Goals" back>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View style={card}>
          <Text variant="bodyStrong">Books in {year}</Text>
          <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconBtn label="Fewer" filled onPress={() => setTarget(Math.max(1, t - 1))}>
              <MinusIcon size={18} weight="bold" color={colors.ink} />
            </IconBtn>
            <Text style={{ fontFamily: fonts.bold, fontSize: 56, lineHeight: 60, letterSpacing: -2 }}>{t}</Text>
            <IconBtn label="More" filled onPress={() => setTarget(Math.min(1000, t + 1))}>
              <PlusIcon size={18} weight="bold" color={colors.ink} />
            </IconBtn>
          </View>
          <Progress value={read / t} style={{ marginTop: spacing.base }} />
          <Text variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
            You have read {read}. {read >= t ? 'Goal reached.' : `${t - read} to go in ${weeksLeft} weeks: about ${Math.ceil((t - read) / weeksLeft)} a week.`}
          </Text>
        </View>
        <View style={card}>
          <Text variant="bodyStrong">Pages a day</Text>
          <View style={{ marginTop: spacing.base }}>
            <Slider value={p} min={5} max={150} step={5} onChange={setPages} label="Pages a day" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text variant="small" tone="muted">
              Daily target
            </Text>
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {p} pages
            </Text>
          </View>
        </View>
        <Btn size="lg" full loading={save.isPending} onPress={() => save.mutate()}>
          Save
        </Btn>
      </View>
    </Screen>
  );
}

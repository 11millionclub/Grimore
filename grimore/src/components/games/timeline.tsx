import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { ArrowCounterClockwiseIcon, CaretRightIcon, LightbulbIcon, LockSimpleIcon } from '@/components/icons';
import { Btn, Cover, Press, Text } from '@/components/ui';
import type { BookCard, GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { applyLocks, moveUnlocked } from '@/utils/game-ui';

export function TimelineGame({ state, onSubmit, onHint, busy }: { state: GameState; onSubmit: (order: string[]) => void; onHint: () => void; busy: boolean }) {
  const { colors } = useTheme();
  const books = state.payload.books ?? [];
  const byId = new Map(books.map((b) => [b.id, b]));
  const locked = state.view.locked ?? [null, null, null, null, null];
  const [order, setOrder] = useState<string[]>(() => applyLocks(books.map((b) => b.id), locked));
  const lockKey = locked.join(',');
  useEffect(() => {
    const t = setTimeout(() => setOrder((o) => applyLocks(o, locked)), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey]);
  const done = state.attempt?.status === 'won' || state.attempt?.status === 'lost';
  const last = state.view.last;
  const solution = state.solution?.order ?? [];
  const shown = done && solution.length ? solution.map((s) => s.id) : order;
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
      <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>
          Oldest
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.lineStrong, marginHorizontal: spacing.md }} />
        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>
          Newest
        </Text>
      </View>
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {shown.map((id, i) => {
          const b = (byId.get(id) ?? solution.find((s) => s.id === id)) as BookCard | undefined;
          if (!b) return null;
          const isLocked = done || !!locked[i];
          const year = solution.find((s) => s.id === id)?.first_published_year;
          return (
            <Animated.View key={id} layout={LinearTransition.springify().damping(18)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: 10, paddingRight: spacing.sm, backgroundColor: isLocked ? colors.goodSoft : last && last[i] === false ? colors.accentSoft : colors.surface }}>
                <Cover uri={b.cover_url} title={b.title} width={40} shadow={false} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="body" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text variant="caption" tone={year ? 'good' : 'muted'} style={year ? { fontFamily: fonts.semibold } : undefined}>
                    {year ?? b.authors.join(', ')}
                  </Text>
                </View>
                {isLocked ? (
                  <LockSimpleIcon size={18} weight="fill" color={colors.good} style={{ marginRight: spacing.sm }} />
                ) : (
                  <View style={{ flexDirection: 'row' }}>
                    <Press accessibilityLabel={`Move ${b.title} earlier`} disabled={busy} onPress={() => setOrder((o) => moveUnlocked(o, i, -1, locked))} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <CaretRightIcon size={20} weight="bold" color={colors.muted} style={{ transform: [{ rotate: '-90deg' }] }} />
                    </Press>
                    <Press accessibilityLabel={`Move ${b.title} later`} disabled={busy} onPress={() => setOrder((o) => moveUnlocked(o, i, 1, locked))} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <CaretRightIcon size={20} weight="bold" color={colors.muted} style={{ transform: [{ rotate: '90deg' }] }} />
                    </Press>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>
      <View style={{ marginTop: 'auto', paddingTop: spacing.base }}>
        <Text variant="small" tone="muted" align="center" style={{ marginBottom: spacing.md }}>
          {state.attempt?.status === 'won' ? 'Perfect order.' : last ? `${last.filter(Boolean).length} of 5 in the right place. Those are locked.` : 'Use the arrows to reorder, then check.'}
        </Text>
        {!done ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {!state.attempt?.hints_used ? (
              <Btn variant="secondary" size="lg" icon={<LightbulbIcon size={18} color={colors.ink} />} disabled={busy} onPress={onHint}>
                +10 s
              </Btn>
            ) : null}
            <Btn size="lg" style={{ flex: 1 }} loading={busy} icon={<ArrowCounterClockwiseIcon size={18} weight="bold" color={colors.onAccent} />} onPress={() => onSubmit(order)}>
              Check order
            </Btn>
          </View>
        ) : null}
      </View>
    </View>
  );
}

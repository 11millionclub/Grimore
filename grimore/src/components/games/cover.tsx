import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { LightbulbIcon } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import type { GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { coverLevel } from '@/utils/game-ui';

export function CoverGame({ state, onPick, onHint, busy }: { state: GameState; onPick: (id: string) => void; onHint: () => void; busy: boolean }) {
  const { colors } = useTheme();
  const wrong = state.view.wrong ?? [];
  const removed = state.view.removed ?? [];
  const won = state.attempt?.status === 'won';
  const lost = state.attempt?.status === 'lost';
  const answer = state.solution?.book?.id;
  const { blur, zoom } = coverLevel(state.view.level ?? 0);
  const scale = useSharedValue(zoom);
  useEffect(() => {
    scale.value = withSpring(zoom, { damping: 30, stiffness: 90 });
  }, [zoom, scale]);
  const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
      <View style={{ alignSelf: 'center', width: '54%', aspectRatio: 2 / 3, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface2, marginTop: spacing.base, borderWidth: won ? 4 : 0, borderColor: colors.good }}>
        <Animated.View style={[{ width: '100%', height: '100%', transformOrigin: '40% 35%' }, zoomStyle]}>
          {/* Keyed by level: some platforms keep the first blur unless the image is redrawn. */}
          <Image key={`lvl-${state.view.level ?? 0}`} source={{ uri: state.payload.cover_url }} blurRadius={blur} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Hidden cover" />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: i < wrong.length ? colors.accent : colors.surface3 }} />
        ))}
      </View>
      <Text variant="callout" tone="muted" align="center" style={{ marginTop: spacing.sm, height: 20 }}>
        {won ? 'That’s the one.' : lost ? `It was ${state.solution?.book?.title ?? ''}.` : wrong.length ? `Wrong. ${4 - wrong.length} left.` : 'Which book is this?'}
      </Text>
      {!won && !lost && !removed.length ? (
        <Press onPress={onHint} disabled={busy} style={{ alignSelf: 'center', marginTop: spacing.sm, height: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 12 }}>
          <LightbulbIcon size={14} color={colors.ink} />
          <Text variant="small" style={{ fontFamily: fonts.semibold }}>
            Remove two · +10 s
          </Text>
        </Press>
      ) : null}
      <View style={{ marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(state.payload.options ?? []).map((o) => {
          const isWrong = wrong.includes(o.id);
          const gone = removed.includes(o.id);
          const isRight = (won || lost) && o.id === answer;
          return (
            <Press
              key={o.id}
              onPress={() => onPick(o.id)}
              disabled={isWrong || gone || won || lost || busy}
              style={{ width: '48.6%', minHeight: 60, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: 'center', backgroundColor: isRight ? colors.good : isWrong || gone ? colors.surface : colors.surface2, opacity: gone ? 0.35 : 1 }}
            >
              <Text variant="callout" numberOfLines={2} style={{ fontFamily: fonts.semibold, textDecorationLine: isWrong ? 'line-through' : 'none' }} color={isRight ? '#000' : isWrong ? colors.faint : colors.ink}>
                {o.title}
              </Text>
              <Text variant="caption" numberOfLines={1} color={isRight ? 'rgba(0,0,0,0.7)' : colors.muted}>
                {o.authors.join(', ')}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

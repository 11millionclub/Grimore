import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { FireIcon, LightbulbIcon } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import type { GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { fold, letterInMask, maskWords } from '@/utils/game-ui';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function Candle({ lit }: { lit: boolean }) {
  const { colors } = useTheme();
  const on = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(lit ? 1 : 0);
  }, [lit, on]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + on.value * 0.85, transform: [{ scale: 0.8 + on.value * 0.2 }, { translateY: (1 - on.value) * 3 }] }));
  return (
    <Animated.View style={style}>
      <FireIcon size={22} weight="fill" color={colors.accent} />
    </Animated.View>
  );
}

export function Hangman({ state, onGuess, onHint, busy }: { state: GameState; onGuess: (l: string) => void; onHint: () => void; busy: boolean }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const mask = state.view.mask ?? state.payload.mask ?? '';
  const guessed = new Set((state.view.guessed ?? []).map((g) => fold(g)));
  const misses = typeof state.view.misses === 'number' ? state.view.misses : 0;
  const done = state.attempt?.status === 'won' || state.attempt?.status === 'lost';
  const solved = state.attempt?.status === 'won';
  const words = maskWords(mask);
  const longest = Math.max(...words.map((w) => w.length), 1);
  const tile = Math.max(20, Math.min(40, Math.floor((Math.min(width, 520) - 48) / Math.max(longest, 8)) - 6));
  const letters = mask.replace(/[^A-Za-zÀ-ÿ_]/g, '').length;
  const keyW = Math.min(34, Math.floor((Math.min(width, 520) - 32 - 9 * 6) / 10));
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.base }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Candle key={i} lit={i < 6 - misses} />
        ))}
      </View>
      <Text variant="small" tone="muted" align="center" style={{ marginTop: spacing.md }}>
        {['Title', state.payload.genre, state.payload.year, `${letters} letters`].filter(Boolean).join(' · ')}
      </Text>

      <View style={{ marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.sm, columnGap: spacing.base }}>
        {words.map((w, wi) => (
          <View key={wi} style={{ flexDirection: 'row', gap: 5 }}>
            {w.map((ch, i) => {
              const blank = ch === '_';
              const letter = /[A-Za-zÀ-ÿ]/.test(ch) || blank;
              return (
                <View
                  key={i}
                  style={{
                    width: letter ? tile : tile * 0.5,
                    height: tile * 1.4,
                    borderRadius: 10,
                    borderBottomWidth: letter ? 2 : 0,
                    borderBottomColor: solved ? colors.good : blank ? colors.lineStrong : colors.accent,
                    backgroundColor: !letter ? 'transparent' : solved ? colors.goodSoft : blank ? colors.surface2 : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.monoBold, fontSize: tile * 0.65 }}>{blank ? '' : ch.toUpperCase()}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ marginTop: spacing.base, height: 36, alignItems: 'center' }}>
        {state.attempt?.status === 'lost' ? (
          <Text variant="callout" tone="muted">
            The candles are out.
          </Text>
        ) : (
          <Press onPress={onHint} disabled={state.view.hinted || done || busy} style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 14 }}>
            <LightbulbIcon size={15} color={colors.ink} />
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              {state.view.hinted ? 'Letter revealed' : 'Reveal a letter · +10 s'}
            </Text>
          </Press>
        )}
      </View>

      <View style={{ marginTop: 'auto', paddingTop: spacing.lg, gap: spacing.sm }}>
        {ROWS.map((r) => (
          <View key={r} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {r.split('').map((l) => {
              const used = guessed.has(l);
              const hit = used && letterInMask(mask, l);
              return (
                <Press
                  key={l}
                  accessibilityLabel={`Letter ${l}`}
                  disabled={done || busy}
                  accessibilityState={{ disabled: used || done }}
                  onPress={() => !used && onGuess(l)}
                  style={{ width: keyW, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: hit ? colors.accent : used ? 'transparent' : colors.surface2 }}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 16, textDecorationLine: used && !hit ? 'line-through' : 'none' }} color={hit ? colors.onAccent : used ? colors.faint : colors.ink}>
                    {l}
                  </Text>
                </Press>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LightbulbIcon, LockSimpleIcon } from '@/components/icons';
import { Cover, Press, Text } from '@/components/ui';
import { useDebounced } from '@/hooks/use-debounced';
import { searchCatalogue } from '@/services/catalogue';
import type { BookCard, GameState } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';

export function CluesGame({ state, onGuess, onHint, busy }: { state: GameState; onGuess: (id: string) => void; onHint: () => void; busy: boolean }) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 250);
  const clues = state.view.clues ?? [];
  const misses = (Array.isArray(state.view.misses) ? state.view.misses : []) as BookCard[];
  const won = state.attempt?.status === 'won';
  const lost = state.attempt?.status === 'lost';
  const sugg = useQuery({ queryKey: ['clue-search', term], queryFn: () => searchCatalogue(term, 6), enabled: term.length >= 2 && !won && !lost });
  const list = (sugg.data ?? []).filter((b) => !misses.some((m) => m.id === b.id)).slice(0, 4);
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
      <ScrollView style={{ flex: 1, marginTop: spacing.base }} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        {Array.from({ length: 5 }).map((_, i) =>
          i < clues.length ? (
            <Animated.View key={i} entering={FadeInDown.duration(350)} style={{ flexDirection: 'row', gap: spacing.md, borderRadius: radius.tile, backgroundColor: colors.surface, padding: 14 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="micro" tone="onAccent" style={{ fontFamily: fonts.bold }}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {clues[i]}
              </Text>
            </Animated.View>
          ) : (
            <View key={i} style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, paddingHorizontal: 14 }}>
              <LockSimpleIcon size={16} color={colors.faint} />
              <Text variant="callout" tone="faint">
                Clue {i + 1}
              </Text>
            </View>
          ),
        )}
        {misses.length ? (
          <Text variant="small" tone="muted">
            Not: {misses.map((m) => m.title).join(', ')}
          </Text>
        ) : null}
        {(won || lost) && state.solution?.book ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, padding: spacing.md, backgroundColor: won ? colors.goodSoft : colors.surface }}>
            <Cover uri={state.solution.book.cover_url} title={state.solution.book.title} width={36} />
            <Text variant="bodyStrong">{lost ? `It was ${state.solution.book.title}` : state.solution.book.title}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View>
        {list.length ? (
          <View style={{ position: 'absolute', bottom: 56, left: 0, right: 0, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' }}>
            {list.map((b) => (
              <Press
                key={b.id}
                disabled={busy}
                onPress={() => {
                  setQ('');
                  onGuess(b.id);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 }}
              >
                <Text variant="body" style={{ flex: 1, fontFamily: fonts.medium }} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: '40%' }}>
                  {b.authors}
                </Text>
              </Press>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, height: 48, borderRadius: radius.full, backgroundColor: colors.surface2, justifyContent: 'center', paddingHorizontal: spacing.base }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              editable={!won && !lost}
              placeholder="Type the title or the author"
              placeholderTextColor={colors.faint}
              selectionColor={colors.accent}
              accessibilityLabel="Your guess"
              style={{ color: colors.ink, fontFamily: fonts.regular, fontSize: 16 }}
            />
          </View>
          <Press onPress={onHint} disabled={clues.length >= 5 || won || lost || busy} accessibilityLabel="One more clue, adds 10 seconds" style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 14 }}>
            <LightbulbIcon size={18} color={colors.ink} />
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              +10 s
            </Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

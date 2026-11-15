import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { GameResult } from '@/components/games/game-result';
import { TopBar } from '@/components/top-bar';
import { Button, EmptyState, Icon, InlineAlert, Screen, Skeleton, Text } from '@/components/ui';
import { coverRevealScore, coverShareText, revealedTiles, visibleFraction } from '@/features/games/presentation';
import type { CoverRevealChallenge } from '@/features/games/types';
import { useGame } from '@/features/games/use-game';
import { coverRevealAnswer, coverRevealHint } from '@/services/games';
import { radius, spacing, useTheme } from '@/theme';
import { formatChallengeDate } from '@/utils/dates';

const GRID = 5;

export default function CoverReveal() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { challenge, loading, finished, error, pending, play } = useGame<CoverRevealChallenge>('cover_reveal');
  const [choice, setChoice] = useState<string | null>(null);

  const hints = challenge?.attempt?.hints_used ?? 0;
  const won = challenge?.attempt?.status === 'won';
  const picked = challenge?.answers[0]?.book?.id;
  const correctId = challenge?.solution?.book?.id;
  const coverW = Math.min(width - 2 * spacing.xxxl, 260);
  const coverH = Math.round(coverW * 1.5);
  const revealed = useMemo(() => (challenge ? revealedTiles(challenge, hints, finished, GRID) : new Set<number>()), [challenge, hints, finished]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Cover Reveal" />
      <Screen edgeTop={false}>
        <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
          <Text variant="eyebrow">{challenge ? formatChallengeDate(challenge.challenge_date) : 'Today'}</Text>
          <Text variant="title1" accessibilityRole="header">
            Judge it by its cover.
          </Text>
          <Text variant="callout" tone="muted">
            {finished ? 'The full jacket, revealed.' : `${Math.round(visibleFraction(hints, false) * 100)}% visible · ${3 - hints} ${3 - hints === 1 ? 'hint' : 'hints'} left · worth ${coverRevealScore(hints, true)} points`}
          </Text>
        </View>

        {loading ? <Skeleton width={coverW} height={coverH} style={{ alignSelf: 'center' }} /> : null}
        {!loading && !challenge ? <EmptyState icon="image" title="No Cover Reveal today" body="Please check back soon." /> : null}

        {challenge ? (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={finished ? `Cover of ${challenge.solution?.book?.title}` : `Book cover, ${revealed.size} of ${GRID * GRID} tiles uncovered`}
            style={{ alignSelf: 'center', width: coverW, height: coverH, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceMuted, boxShadow: '0 12px 30px rgba(40,28,20,0.22)', marginBottom: spacing.xl }}
          >
            <Image source={{ uri: challenge.payload.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
            <View style={{ position: 'absolute', inset: 0, flexDirection: 'row', flexWrap: 'wrap' }} pointerEvents="none">
              {Array.from({ length: GRID * GRID }).map((_, i) =>
                revealed.has(i) ? (
                  <View key={i} style={{ width: coverW / GRID, height: coverH / GRID }} />
                ) : (
                  <Animated.View
                    key={i}
                    exiting={FadeOut.duration(420).delay((i % GRID) * 40)}
                    style={{
                      width: coverW / GRID,
                      height: coverH / GRID,
                      backgroundColor: colors.ink,
                      borderWidth: 1,
                      borderColor: colors.inkMuted,
                    }}
                  />
                ),
              )}
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InlineAlert>{error}</InlineAlert>
          </View>
        ) : null}

        {challenge && !finished ? (
          <View style={{ gap: spacing.md }}>
            <Button
              title={hints >= 3 ? 'No hints left' : `Reveal more (${3 - hints} left)`}
              icon="eye"
              variant="secondary"
              disabled={hints >= 3}
              loading={pending && !choice}
              onPress={() => void play(() => coverRevealHint(challenge.id))}
            />
            <Text variant="eyebrow" style={{ marginTop: spacing.base }}>
              Which book is it?
            </Text>
            {challenge.payload.options.map((o) => (
              <Option key={o.id} title={o.title} subtitle={o.authors.join(', ')} selected={choice === o.id} onPress={() => setChoice(o.id)} />
            ))}
            <Button
              title="Lock in answer"
              size="lg"
              disabled={!choice}
              loading={pending && !!choice}
              onPress={() => choice && void play(() => coverRevealAnswer(challenge.id, choice))}
              style={{ marginTop: spacing.sm }}
            />
            <Text variant="caption" align="center">
              One answer per day. Fewer hints, more points.
            </Text>
          </View>
        ) : null}

        {challenge && finished ? (
          <GameResult
            won={won}
            headline={challenge.solution?.book?.title ?? ''}
            detail={won ? `Named with ${hints} ${hints === 1 ? 'hint' : 'hints'} · ${challenge.attempt?.score} points` : `You chose ${challenge.payload.options.find((o) => o.id === picked)?.title ?? 'another book'}.`}
            book={challenge.solution?.book}
            xp={challenge.attempt?.xp_awarded ?? 0}
            shareText={coverShareText(challenge.challenge_date, hints, won)}
          >
            <View style={{ gap: spacing.sm }}>
              {challenge.payload.options.map((o) => (
                <Option key={o.id} title={o.title} subtitle={o.authors.join(', ')} state={o.id === correctId ? 'correct' : o.id === picked ? 'wrong' : 'idle'} />
              ))}
            </View>
          </GameResult>
        ) : null}
      </Screen>
    </View>
  );
}

function Option({
  title,
  subtitle,
  selected,
  onPress,
  state = 'idle',
}: {
  title: string;
  subtitle: string;
  selected?: boolean;
  onPress?: () => void;
  state?: 'idle' | 'correct' | 'wrong';
}) {
  const { colors } = useTheme();
  const border = state === 'correct' ? colors.olive : state === 'wrong' ? colors.danger : selected ? colors.ink : colors.border;
  return (
    <Pressable
      accessibilityRole={onPress ? 'radio' : 'text'}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${title} by ${subtitle}${state === 'correct' ? ', correct answer' : state === 'wrong' ? ', your answer' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.base,
        borderRadius: radius.md,
        borderWidth: selected || state !== 'idle' ? 1.5 : 1,
        borderColor: border,
        backgroundColor: state === 'correct' ? colors.oliveSoft : state === 'wrong' ? colors.dangerSoft : pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bookTitle">{title}</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      {state === 'correct' ? <Icon name="check" size={18} tone="olive" /> : state === 'wrong' ? <Icon name="x" size={18} tone="danger" /> : <Icon name={selected ? 'check-circle' : 'circle'} size={18} tone={selected ? 'accent' : 'inkSubtle'} />}
    </Pressable>
  );
}

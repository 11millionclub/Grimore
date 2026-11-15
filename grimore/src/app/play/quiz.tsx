import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameResult } from '@/components/games/game-result';
import { TopBar } from '@/components/top-bar';
import { Button, EmptyState, Icon, InlineAlert, Screen, Skeleton, Text } from '@/components/ui';
import { quizShareText } from '@/features/games/presentation';
import type { QuizChallenge } from '@/features/games/types';
import { useGame } from '@/features/games/use-game';
import { quizAnswer } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { formatChallengeDate } from '@/utils/dates';

const CATEGORY_LABEL: Record<string, string> = {
  author: 'Authors',
  character: 'Characters',
  origin: 'Origins',
  movement: 'Movements',
  opening_line: 'Opening lines',
  setting: 'Settings',
  awards: 'Prizes',
  general: 'Literary life',
};
const LETTERS = ['A', 'B', 'C', 'D'];
const DIFFICULTY = ['', 'Gentle', 'Considered', 'Scholarly'];

export default function Quiz() {
  const { colors } = useTheme();
  const { challenge, loading, finished, error, pending, play } = useGame<QuizChallenge>('quiz');
  const [choice, setChoice] = useState<number | null>(null);

  const picked = challenge?.answers[0]?.selected_index ?? null;
  const correct = challenge?.solution?.correct_index ?? null;
  const won = challenge?.attempt?.status === 'won';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Literary Quiz" />
      <Screen edgeTop={false}>
        {loading ? <Skeleton height={220} rounded={radius.lg} /> : null}
        {!loading && !challenge ? <EmptyState icon="help-circle" title="No quiz today" body="Please check back soon." /> : null}

        {challenge ? (
          <View style={{ gap: spacing.xl }}>
            <View style={{ gap: spacing.sm }}>
              <Text variant="eyebrow">
                {formatChallengeDate(challenge.challenge_date)} · {CATEGORY_LABEL[challenge.payload.category] ?? 'Literature'} · {DIFFICULTY[challenge.difficulty]}
              </Text>
              <Text variant="title1" accessibilityRole="header">
                {challenge.payload.prompt.replace(/"([^"]+)"/g, '“$1”')}
              </Text>
            </View>

            <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
              {challenge.payload.options.map((o, i) => {
                const state = finished ? (i === correct ? 'correct' : i === picked ? 'wrong' : 'idle') : choice === i ? 'selected' : 'idle';
                const border = state === 'correct' ? colors.olive : state === 'wrong' ? colors.danger : state === 'selected' ? colors.ink : colors.border;
                return (
                  <Pressable
                    key={o}
                    disabled={finished}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: state === 'selected', disabled: finished }}
                    accessibilityLabel={`${LETTERS[i]}: ${o}${state === 'correct' ? ', correct' : state === 'wrong' ? ', your answer, incorrect' : ''}`}
                    onPress={() => setChoice(i)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.base,
                      padding: spacing.base,
                      minHeight: 60,
                      borderRadius: radius.md,
                      borderWidth: state === 'idle' ? 1 : 1.5,
                      borderColor: border,
                      backgroundColor: state === 'correct' ? colors.oliveSoft : state === 'wrong' ? colors.dangerSoft : pressed ? colors.surfaceMuted : colors.surface,
                    })}
                  >
                    <Text style={{ fontFamily: fonts.serifItalic, fontSize: 20, color: colors.inkSubtle, width: 18 }}>{LETTERS[i]}</Text>
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      {o}
                    </Text>
                    {state === 'correct' ? <Icon name="check" tone="olive" /> : state === 'wrong' ? <Icon name="x" tone="danger" /> : null}
                  </Pressable>
                );
              })}
            </View>

            {error ? <InlineAlert>{error}</InlineAlert> : null}

            {!finished ? (
              <View style={{ gap: spacing.sm }}>
                <Button title="Final answer" size="lg" disabled={choice === null} loading={pending} onPress={() => choice !== null && void play(() => quizAnswer(challenge.id, choice))} />
                <Text variant="caption" align="center">
                  One answer per day. Take your time.
                </Text>
              </View>
            ) : (
              <GameResult
                won={won}
                headline={won ? 'Well read.' : 'Not this time.'}
                detail={challenge.solution?.explanation ?? ''}
                book={challenge.solution?.book}
                xp={challenge.attempt?.xp_awarded ?? 0}
                shareText={quizShareText(challenge.challenge_date, won)}
              />
            )}
          </View>
        ) : null}
      </Screen>
    </View>
  );
}

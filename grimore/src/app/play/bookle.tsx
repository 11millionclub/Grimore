import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BookSearch } from '@/components/book-search';
import { GameResult } from '@/components/games/game-result';
import { TopBar } from '@/components/top-bar';
import { BookCover, Button, EmptyState, Icon, InlineAlert, Screen, Skeleton, Text } from '@/components/ui';
import { bookleCells, bookleShareText, type ClueCell } from '@/features/games/presentation';
import type { BookleChallenge, GameAnswer } from '@/features/games/types';
import { useGame } from '@/features/games/use-game';
import type { BookSummary } from '@/services/catalogue';
import { bookleGuess } from '@/services/games';
import { radius, spacing, useTheme } from '@/theme';
import { formatChallengeDate } from '@/utils/dates';

const MAX = 6;

export default function Bookle() {
  const { colors } = useTheme();
  const { challenge, loading, finished, error, pending, play } = useGame<BookleChallenge>('bookle');
  const [candidate, setCandidate] = useState<BookSummary | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const answers = challenge?.answers ?? [];
  const left = MAX - answers.length;
  const won = challenge?.attempt?.status === 'won';

  const submit = async () => {
    if (!challenge || !candidate) return;
    await play(() => bookleGuess(challenge.id, candidate.id));
    setCandidate(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Bookle" right={<Pressable accessibilityRole="button" accessibilityLabel="How to play" onPress={() => setShowHelp((s) => !s)} hitSlop={10} style={{ padding: spacing.sm }}><Icon name="help-circle" /></Pressable>} />
      <Screen keyboard edgeTop={false}>
        <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
          <Text variant="eyebrow">{challenge ? formatChallengeDate(challenge.challenge_date) : 'Today'}</Text>
          <Text variant="title1" accessibilityRole="header">
            Name the book.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }} accessibilityLabel={`${left} guesses left`}>
            {Array.from({ length: MAX }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 22,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i < answers.length ? (answers[i]?.is_correct ? colors.olive : colors.ink) : colors.borderStrong,
                }}
              />
            ))}
            <Text variant="caption" style={{ marginLeft: spacing.xs }}>
              {finished ? (won ? `Solved in ${answers.length}` : 'Out of guesses') : `${left} left`}
            </Text>
          </View>
        </View>

        {showHelp || (!loading && answers.length === 0 && !finished) ? <Legend /> : null}

        {loading ? <Skeleton height={180} rounded={radius.lg} /> : null}
        {!loading && !challenge ? <EmptyState icon="calendar" title="No Bookle today" body="Today’s puzzle is still being bound. Please check back soon." /> : null}

        {challenge ? (
          <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
            {answers.map((a) => (
              <GuessRow key={a.position} answer={a} />
            ))}
          </View>
        ) : null}

        {challenge?.clues.author_initials && !finished ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InlineAlert tone="ochre">The author’s initials are {challenge.clues.author_initials}</InlineAlert>
          </View>
        ) : null}

        {error ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InlineAlert>{error}</InlineAlert>
          </View>
        ) : null}

        {challenge && finished ? (
          <GameResult
            won={won}
            headline={challenge.solution?.book?.title ?? ''}
            detail={won ? `You found it in ${answers.length} ${answers.length === 1 ? 'guess' : 'guesses'}.` : 'A tricky one. Tomorrow is a new story.'}
            book={challenge.solution?.book}
            xp={challenge.attempt?.xp_awarded ?? 0}
            shareText={bookleShareText(challenge.challenge_date, answers, won)}
          />
        ) : null}

        {challenge && !finished ? (
          candidate ? (
            <Animated.View entering={FadeInDown.duration(220)} style={{ gap: spacing.md, padding: spacing.base, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <BookCover title={candidate.title} uri={candidate.cover_url} size="xs" />
                <View style={{ flex: 1 }}>
                  <Text variant="bookTitle">{candidate.title}</Text>
                  <Text variant="caption">{candidate.authors}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Change" variant="ghost" onPress={() => setCandidate(null)} style={{ flex: 1 }} />
                <Button title={`Guess ${answers.length + 1} of ${MAX}`} loading={pending} onPress={() => void submit()} style={{ flex: 2 }} />
              </View>
            </Animated.View>
          ) : (
            <BookSearch
              includeExternal={false}
              placeholder="Search the catalogue for your guess"
              excludeIds={answers.map((a) => a.book?.id ?? '')}
              onSelect={(b) => setCandidate(b)}
              renderTrailing={() => <Icon name="corner-down-left" size={16} tone="inkSubtle" />}
            />
          )
        ) : null}
      </Screen>
    </View>
  );
}

function Legend() {
  const { colors } = useTheme();
  const items = [
    { color: colors.olive, label: 'Match' },
    { color: colors.ochre, label: 'Close' },
    { color: colors.surfaceMuted, label: 'Not a match', border: true },
  ];
  return (
    <View style={{ gap: spacing.sm, padding: spacing.base, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl }}>
      <Text variant="callout">
        Each guess compares your book with today’s answer: decade, genre, the author’s country, title length, page count and author. Arrows point towards the answer.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.base, flexWrap: 'wrap' }}>
        {items.map((i) => (
          <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: i.color, borderWidth: i.border ? 1 : 0, borderColor: colors.borderStrong }} />
            <Text variant="caption">{i.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GuessRow({ answer }: { answer: GameAnswer }) {
  const cells = answer.feedback ? bookleCells(answer.feedback) : [];
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="caption" tone="subtle">
          {answer.position}
        </Text>
        <Text variant="bookTitle" numberOfLines={1} style={{ flex: 1 }}>
          {answer.book?.title}
        </Text>
        {answer.is_correct ? <Icon name="check-circle" size={16} tone="olive" /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {cells.map((c) => (
          <Cell key={c.key} cell={c} />
        ))}
      </View>
    </Animated.View>
  );
}

function Cell({ cell }: { cell: ClueCell }) {
  const { colors } = useTheme();
  const bg = cell.tone === 'match' ? colors.olive : cell.tone === 'close' ? colors.ochre : colors.surfaceMuted;
  const fg = cell.tone === 'match' ? colors.onOlive : cell.tone === 'close' ? '#FFFFFF' : colors.ink;
  return (
    <View
      accessible
      accessibilityLabel={cell.a11y}
      style={{ width: '32%', flexGrow: 1, minHeight: 58, padding: spacing.sm, borderRadius: radius.md, backgroundColor: bg, justifyContent: 'space-between' }}
    >
      <Text style={{ color: fg, opacity: 0.75, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }} variant="caption">
        {cell.label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text variant="callout" numberOfLines={2} style={{ color: fg, flexShrink: 1, fontSize: 13, lineHeight: 17 }}>
          {cell.tone === 'unknown' ? '?' : cell.value}
        </Text>
        {cell.direction ? <Icon name={cell.direction === 'up' ? 'arrow-up' : 'arrow-down'} size={13} color={fg} /> : null}
      </View>
    </View>
  );
}

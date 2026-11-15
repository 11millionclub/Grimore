import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BookCover, Button, Text } from '@/components/ui';
import type { BookCard } from '@/features/games/types';
import { radius, spacing, useTheme } from '@/theme';
import { formatCountdown, msUntilNextChallenge } from '@/utils/dates';

/** Shared end-of-game panel: the answer, the outcome, XP and a share card. */
export function GameResult({
  won,
  headline,
  detail,
  book,
  xp,
  shareText,
  children,
}: {
  won: boolean;
  headline: string;
  detail: string;
  book?: BookCard | null;
  xp: number;
  shareText: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState(formatCountdown(msUntilNextChallenge()));
  useEffect(() => {
    const t = setInterval(() => setCountdown(formatCountdown(msUntilNextChallenge())), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View entering={FadeInUp.duration(450)} style={{ gap: spacing.xl }} accessibilityLiveRegion="polite">
      <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderRadius: radius.xl, backgroundColor: won ? colors.oliveSoft : colors.surfaceMuted }}>
        <Text variant="eyebrow" tone={won ? 'olive' : 'muted'}>
          {won ? 'Solved' : 'Today’s answer'}
        </Text>
        {book ? (
          <BookCover title={book.title} author={book.authors.join(', ')} uri={book.cover_url} size="lg" />
        ) : null}
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text variant="title2" align="center">
            {headline}
          </Text>
          {book ? (
            <Text variant="callout" tone="muted" align="center">
              {book.authors.join(', ')}
              {book.first_published_year ? ` · ${book.first_published_year}` : ''}
            </Text>
          ) : null}
          <Text variant="callout" align="center" style={{ marginTop: spacing.sm }}>
            {detail}
          </Text>
        </View>
        {xp > 0 ? (
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface }}>
            <Text variant="bodyStrong" tone="accent">
              +{xp} XP
            </Text>
          </View>
        ) : null}
      </View>
      {children}
      <View style={{ gap: spacing.sm }}>
        <Button title="Share result" icon="share" variant="secondary" fullWidth onPress={() => void Share.share({ message: shareText })} />
        {book ? <Button title="Open the book" variant="ghost" fullWidth onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })} /> : null}
      </View>
      <Text variant="caption" align="center">
        Next challenge in {countdown}
      </Text>
    </Animated.View>
  );
}

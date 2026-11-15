import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookCover, Button, Text } from '@/components/ui';
import { layout, spacing, useTheme } from '@/theme';

const SHELF = [
  { title: 'One Hundred Years of Solitude', author: 'García Márquez' },
  { title: 'Mrs Dalloway', author: 'Virginia Woolf' },
  { title: 'Blindness', author: 'José Saramago' },
  { title: 'Beloved', author: 'Toni Morrison' },
  { title: 'Norwegian Wood', author: 'Haruki Murakami' },
];

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }}>
      <View style={{ flex: 1, paddingHorizontal: layout.screenPadding, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ gap: spacing.md }}>
          <Text variant="eyebrow" tone="accent">
            GriMore
          </Text>
          <Text variant="display">Your world{'\n'}of stories.</Text>
          <Text variant="serifBody" tone="muted" style={{ maxWidth: 340 }}>
            Collect the books you love, keep a journal of your reading life, and play three small literary puzzles every day.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(700)}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            {SHELF.map((b, i) => (
              <View key={b.title} style={{ transform: [{ translateY: i % 2 ? -10 : 0 }, { rotate: `${(i - 2) * 2}deg` }] }}>
                <BookCover title={b.title} author={b.author} width={i === 2 ? 96 : 72} accessible={false} />
              </View>
            ))}
          </View>
          <View style={{ height: 1, width: '90%', backgroundColor: colors.borderStrong, marginTop: spacing.sm }} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(350).duration(600)} style={{ gap: spacing.md }}>
          <Button title="Create your account" size="lg" fullWidth onPress={() => router.push('/sign-up')} />
          <Button title="I already have an account" size="lg" variant="ghost" fullWidth onPress={() => router.push('/sign-in')} />
        </Animated.View>
      </View>
    </View>
  );
}

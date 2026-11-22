import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverWall } from '@/components/cover-wall';
import { Btn, Text } from '@/components/ui';
import { fonts, layout, radius, spacing, useTheme } from '@/theme';

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CoverWall height={height * 0.64} />
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.md, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(600).reduceMotion(ReduceMotion.System)}>
          <View style={{ width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} tone="onAccent">
              G
            </Text>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 47, letterSpacing: -0.5, marginTop: spacing.lg }}>
            Everything you read,{'\n'}in one place.
          </Text>
          <Text variant="body" tone="muted" style={{ marginTop: spacing.md, fontSize: 16, lineHeight: 24, maxWidth: 340 }}>
            Log your reading, discover your reader profile and find people who read like you.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(600).delay(120).reduceMotion(ReduceMotion.System)} style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
          <Btn size="lg" full onPress={() => router.push('/sign-up')}>
            Get started
          </Btn>
          <Btn size="lg" variant="ghost" full onPress={() => router.push('/sign-in')}>
            I already have an account
          </Btn>
        </Animated.View>
      </View>
    </View>
  );
}

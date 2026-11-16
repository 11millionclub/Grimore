import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LibraryScene } from '@/components/nook/library-scene';
import { Emblem, Flourish, Wordmark } from '@/components/ornaments';
import { Button, Text } from '@/components/ui';
import { fonts, layout, spacing } from '@/theme';

/** First impression: the Great Hall at night, the house seal, and two doors in. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#140E09' }}>
      <LibraryScene id="great-hall" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient colors={['rgba(14,9,5,0.55)', 'rgba(14,9,5,0.15)', 'rgba(14,9,5,0.92)']} locations={[0, 0.4, 0.78]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <View style={{ flex: 1, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: layout.screenPadding, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center', justifyContent: 'space-between' }}>
        <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', gap: spacing.base }}>
          <Emblem size={64} color="#D9B66E" background="rgba(20,14,9,0.55)" />
          <Wordmark size={18} color="#F6EEDD" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(700)} style={{ gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontFamily: fonts.serifBold, fontSize: 40, lineHeight: 44, color: '#F8F0DF', textAlign: 'center' }} accessibilityRole="header">
              Find your next obsession.
            </Text>
            <Flourish width={180} color="#D9B66E" />
            <Text style={{ fontFamily: fonts.serifMedium, fontSize: 19, lineHeight: 26, color: '#E3D6BE', textAlign: 'center', maxWidth: 340 }}>
              Gather every book you own into one enchanted library, and let it tell you what to read next.
            </Text>
          </View>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button title="Open the doors" size="lg" fullWidth onPress={() => router.push('/sign-up')} />
            <Button title="I already have a key" size="lg" variant="onDark" fullWidth onPress={() => router.push('/sign-in')} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

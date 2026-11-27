import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { AppWindowIcon, FlagBannerIcon, IdentificationBadgeIcon, PaletteIcon, SquaresFourIcon, StickerIcon, type IconProps } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Avatar, Btn, Text } from '@/components/ui';
import { useMyProfile } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { env } from '@/lib/env';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, type HouseId, houseInk, houseTokens } from '@/theme/houses';
import { breakdown, type Scores } from '@/utils/sorting';

import { Percentages } from './sorting';

const ORBIT = 112;
const SPIN_MS = 2000;

const KIT: { key: 'frame' | 'banner' | 'badge' | 'nameColour' | 'stickers' | 'icon'; Icon: ComponentType<IconProps> }[] = [
  { key: 'frame', Icon: SquaresFourIcon },
  { key: 'banner', Icon: FlagBannerIcon },
  { key: 'badge', Icon: IdentificationBadgeIcon },
  { key: 'nameColour', Icon: PaletteIcon },
  { key: 'stickers', Icon: StickerIcon },
  { key: 'icon', Icon: AppWindowIcon },
];

function OrbitSigil({ house, i, spin, chosen, landed }: { house: HouseId; i: number; spin: SharedValue<number>; chosen: boolean; landed: SharedValue<number> }) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const style = useAnimatedStyle(() => {
    const a = (i / 4) * Math.PI * 2 + spin.value;
    const r = ORBIT * (1 - landed.value * (chosen ? 1 : 0));
    return {
      transform: [{ translateX: Math.cos(a) * r }, { translateY: Math.sin(a) * r }, { scale: chosen ? 1 + landed.value * 1.3 : 1 - landed.value }],
      opacity: chosen ? 1 : 1 - landed.value,
      zIndex: chosen ? 2 : 1,
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Sigil house={house} size={28} color={chosen ? houseInk(house, dark) : colors.muted} label={false} />
    </Animated.View>
  );
}

/**
 * A small ceremony: the four sigils orbit the reader's avatar and slow down
 * (a haptic tick as each passes), the chosen one comes forward, the screen
 * floods with the House colour and the name lands. Reduced motion: a cross-fade.
 */
export function Reveal({ house, scores, onContinue }: { house: HouseId; scores: Scores | null; onContinue: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const profile = useMyProfile();
  const p = profile.data;
  const tk = houseTokens[house];
  const spin = useSharedValue(0);
  const landed = useSharedValue(0);
  const flood = useSharedValue(0);
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      flood.value = 1;
      return;
    }
    // Four turns that slow to a stop, with the chosen sigil ending at the front (bottom).
    const target = Math.PI * 2 * 3 + Math.PI / 2 - (HOUSE_IDS.indexOf(house) / 4) * Math.PI * 2;
    spin.value = withTiming(target, { duration: SPIN_MS, easing: Easing.out(Easing.cubic) });
    landed.value = withDelay(SPIN_MS, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    flood.value = withDelay(SPIN_MS + 250, withTiming(1, { duration: 500 }, (fin) => fin && runOnJS(setDone)(true)));
    const ticks = [80, 200, 340, 500, 690, 910, 1170, 1480, 1850].map((ms) => setTimeout(() => Platform.OS !== 'web' && void Haptics.selectionAsync(), ms));
    const thud = setTimeout(() => Platform.OS !== 'web' && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), SPIN_MS + 200);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(thud);
    };
  }, [house, reduced, spin, landed, flood]);

  const floodStyle = useAnimatedStyle(() => ({ opacity: flood.value, transform: [{ scale: 0.2 + flood.value * 3 }] }));
  const avatarStyle = useAnimatedStyle(() => ({ opacity: 1 - landed.value }));
  const rows = scores ? breakdown(scores) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', alignSelf: 'center', top: '10%', width: 600, height: 600, borderRadius: 300, backgroundColor: tk.primary }, floodStyle]} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ height: ORBIT * 2 + 64, alignItems: 'center', justifyContent: 'center' }}>
          {reduced ? (
            <Animated.View entering={FadeIn.duration(600)}>
              <Sigil house={house} size={110} color={tk.onPrimary} />
            </Animated.View>
          ) : (
            <>
              <Animated.View style={avatarStyle}>
                <Avatar uri={p?.avatar_url} name={p?.display_name ?? p?.username} size={88} />
              </Animated.View>
              {HOUSE_IDS.map((h, i) => (
                <OrbitSigil key={h} house={h} i={i} spin={spin} chosen={h === house} landed={landed} />
              ))}
            </>
          )}
        </View>

        {done ? (
          <Animated.View entering={FadeInDown.duration(500).reduceMotion(ReduceMotion.System)}>
            <Text align="center" variant="body" color={tk.onPrimary}>
              {t('sorting.reveal.welcome')}
            </Text>
            <Text accessibilityRole="header" align="center" style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48 }} color={tk.onPrimary}>
              {HOUSE_NAMES[house]}
            </Text>
            <Text align="center" variant="quote" color={tk.onPrimary} style={{ marginTop: spacing.base }}>
              “{t(`houses.${house}.motto`)}”
            </Text>

            <View style={{ marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base, gap: spacing.sm, borderWidth: 1, borderColor: colors.gold }}>
              {/* The result description exactly as written in the specification. */}
              <Text variant="callout">{t(`houses.${house}.description`)}</Text>
              {rows.length ? (
                <View style={{ marginTop: spacing.sm, gap: 6 }}>
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {t('sorting.reveal.percentages')}
                  </Text>
                  <Percentages rows={rows} />
                </View>
              ) : null}
            </View>

            <View style={{ marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base, borderWidth: 1, borderColor: colors.line }}>
              <Text variant="h2" style={{ fontSize: 14 }}>
                {t('sorting.reveal.kitTitle')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
                {KIT.map(({ key, Icon }) => (
                  <View key={key} style={{ width: '33.3%', alignItems: 'center', paddingVertical: spacing.sm, gap: 4 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={tk.onPrimary} weight="fill" />
                    </View>
                    <Text variant="caption" align="center">
                      {t(`kit.${key}`)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <ShareButton house={house} rows={rows} handle={p?.username ?? ''} />
            <Btn size="lg" full onPress={onContinue} style={{ marginTop: spacing.sm }}>
              {t('common.continue')}
            </Btn>
            <Text variant="caption" tone="muted" align="center">
              {t('sorting.reveal.changeHint')}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Captures a 9:16 story card or a 1:1 post card and opens the share sheet. */
function ShareButton({ house, rows, handle }: { house: HouseId; rows: { house: HouseId; pct: number }[]; handle: string }) {
  const { t } = useTranslation();
  const story = useRef<ViewShotRef>(null);
  const post = useRef<ViewShotRef>(null);
  const text = t('sorting.shareText', { member: t(`houses.${house}.member`), house: HOUSE_NAMES[house], motto: t(`houses.${house}.motto`) }) + (env.EXPO_PUBLIC_APP_URL ? ` ${env.EXPO_PUBLIC_APP_URL}` : '');
  const share = async (format: 'story' | 'post') => {
    track('house_share_tapped', { format, house });
    try {
      const uri = await (format === 'story' ? story : post).current?.capture?.();
      if (uri && Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: text });
      else await Share.share({ message: text });
    } catch {
      /* cancelled */
    }
  };
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text variant="small" align="center" style={{ fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
        {t('sorting.reveal.share')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Btn variant="secondary" style={{ flex: 1 }} onPress={() => void share('story')}>
          {t('sorting.shareStory')}
        </Btn>
        <Btn variant="secondary" style={{ flex: 1 }} onPress={() => void share('post')}>
          {t('sorting.sharePost')}
        </Btn>
      </View>
      {/* Off-screen cards captured for sharing. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -2000, top: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ViewShot ref={story} options={{ format: 'png', quality: 1 }}>
          <ShareCard house={house} rows={rows} handle={handle} width={360} height={640} />
        </ViewShot>
        <ViewShot ref={post} options={{ format: 'png', quality: 1 }}>
          <ShareCard house={house} rows={rows} handle={handle} width={480} height={480} />
        </ViewShot>
      </View>
    </View>
  );
}

function ShareCard({ house, rows, handle, width, height }: { house: HouseId; rows: { house: HouseId; pct: number }[]; handle: string; width: number; height: number }) {
  const { t } = useTranslation();
  const tk = houseTokens[house];
  return (
    <View style={{ width, height, backgroundColor: tk.primary, padding: 32, justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 19, letterSpacing: 2 }} color={tk.onPrimary}>
        GRIMORE
      </Text>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Sigil house={house} size={height > width ? 140 : 110} color={tk.onPrimary} label={false} />
        <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48 }} color={tk.onPrimary}>
          {HOUSE_NAMES[house]}
        </Text>
        <Text variant="quote" align="center" color={tk.onPrimary}>
          “{t(`houses.${house}.motto`)}”
        </Text>
        {rows.length ? (
          <Text variant="small" align="center" color={tk.onPrimary}>
            {rows.map((r) => `${r.pct}% ${HOUSE_NAMES[r.house]}`).join(' · ')}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text variant="bodyStrong" color={tk.onPrimary}>
          @{handle}
        </Text>
        <Text variant="small" color={tk.onPrimary}>
          {env.EXPO_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? t(`houses.${house}.members`)}
        </Text>
      </View>
    </View>
  );
}

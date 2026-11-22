import { AppActions } from '@/components/app-actions';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { DEFAULT_LOOK } from '@/components/corner';
import { CornerBlocks } from '@/components/corner-view';
import { PaintBrushIcon, ShareNetworkIcon } from '@/components/icons';
import { ProfileHero } from '@/components/profile-hero';
import { ShelvesView } from '@/components/shelves-view';
import { StatsView } from '@/components/stats-view';
import { Btn, IconBtn, Screen, Segmented, Skeleton } from '@/components/ui';
import { useCorner, useCounts, useMyId, useMyProfile } from '@/hooks/queries';
import { spacing, useTheme } from '@/theme';

export default function Me() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const corner = useCorner(me);
  const counts = useCounts(me);
  const [tab, setTab] = useState<'corner' | 'stats' | 'shelves'>('corner');
  const c = corner.data;
  const look = c ? { theme: c.theme, frame: c.frame, shelf: c.shelf, name_style: c.name_style, pack: c.pack } : DEFAULT_LOOK;
  const p = profile.data;

  const hero = p ? (
    <ProfileHero
      profile={p}
      look={look}
      counts={counts.data}
      actions={
        <>
          <Btn variant="secondary" size="sm" icon={<PaintBrushIcon size={15} color={colors.ink} />} onPress={() => router.push('/corner/edit')}>
            Customise
          </Btn>
          <IconBtn label="Share profile" size={32} filled onPress={() => void Share.share({ message: `Find me on Grimore: @${p.username}` })}>
            <ShareNetworkIcon size={15} color={colors.ink} />
          </IconBtn>
        </>
      }
    />
  ) : (
    <Skeleton height={330} rounded={0} />
  );

  return (
    <Screen
      title={p?.display_name ?? p?.username ?? 'Me'}
      large={false}
      hero={hero}
      barTransparent
      tabs
      refreshing={corner.isRefetching}
      onRefresh={() => Promise.all([corner.refetch(), counts.refetch(), profile.refetch()])}
      actions={<AppActions />}
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'corner', label: 'Corner' },
            { value: 'stats', label: 'Stats' },
            { value: 'shelves', label: 'Shelves' },
          ]}
        />
      </View>
      <Animated.View key={tab} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
        {tab === 'corner' ? <CornerBlocks userId={me} look={look} widgets={c?.widgets ?? []} status={c?.status_text} song={c?.song} /> : tab === 'stats' ? <StatsView userId={me} /> : <ShelvesView userId={me} isMe />}
      </Animated.View>
    </Screen>
  );
}

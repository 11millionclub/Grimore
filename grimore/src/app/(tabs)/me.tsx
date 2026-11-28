import { AppActions } from '@/components/app-actions';
import { UserPosts } from '@/components/user-posts';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { DEFAULT_LOOK } from '@/components/corner';
import { CornerBlocks } from '@/components/corner-view';
import { BookBookmarkIcon, PaintBrushIcon, ShareNetworkIcon } from '@/components/icons';
import { ProfileHero } from '@/components/profile-hero';
import { ShelvesView } from '@/components/shelves-view';
import { StatsView } from '@/components/stats-view';
import { isScene } from '@/components/library-panel';
import { GildedTabs } from '@/components/ornament';
import { Btn, IconBtn, Press, Screen, Skeleton, shareText, Text } from '@/components/ui';
import { useCorner, useCounts, useMyId, useMyProfile } from '@/hooks/queries';
import { DarkTheme, fonts, GILT, radius, spacing, useTheme } from '@/theme';

/** Your profile is your library: the whole page is lit like the room at night. */
export default function Me() {
  return (
    <DarkTheme>
      <MeInner />
    </DarkTheme>
  );
}

function MeInner() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const corner = useCorner(me);
  const counts = useCounts(me);
  const [tab, setTab] = useState<'corner' | 'posts' | 'stats' | 'shelves'>('corner');
  const c = corner.data;
  const look = c ? { theme: c.theme, frame: c.frame, shelf: c.shelf, name_style: c.name_style, pack: c.pack, banner_url: c.community_banner?.banner_url ?? null } : DEFAULT_LOOK;
  const p = profile.data;

  const hero = p ? (
    <ProfileHero
      profile={p}
      look={look}
      scene={isScene(c?.library) ? c.library : 'classic'}
      counts={counts.data}
      actions={
        <>
          <Btn variant="secondary" size="sm" icon={<PaintBrushIcon size={15} color={colors.ink} />} onPress={() => router.push('/corner/edit')}>
            Customise
          </Btn>
          <IconBtn label="Share profile" size={32} filled onPress={() => void shareText(`Find me on Grimore: @${p.username}`)}>
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
      <ReadersCodexCard />
      <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.lg }}>
        <GildedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'corner', label: 'My Grimore' },
            { value: 'posts', label: 'Reviews' },
            { value: 'stats', label: 'Stats' },
            { value: 'shelves', label: 'Shelves' },
          ]}
        />
      </View>
      <Animated.View key={tab} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
        {tab === 'corner' ? <CornerBlocks userId={me} look={look} widgets={c?.widgets ?? []} status={c?.status_text} song={c?.song} library={c?.library} /> : tab === 'posts' ? <UserPosts userId={me} viewerId={me} /> : tab === 'stats' ? <StatsView userId={me} /> : <ShelvesView userId={me} isMe />}
      </Animated.View>
    </Screen>
  );
}

/** The Readers Codex (your reading month and year, told as a story) lives on your profile. */
function ReadersCodexCard() {
  const { colors } = useTheme();
  const year = new Date().getFullYear();
  const open = (period: 'month' | 'year') => router.push({ pathname: '/wrapped', params: { period } });
  return (
    <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: GILT.gold, backgroundColor: colors.surface, padding: spacing.base, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: GILT.gold, alignItems: 'center', justifyContent: 'center' }}>
          <BookBookmarkIcon size={20} weight="fill" color={GILT.black} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 21 }} color={GILT.champagne}>
            Readers Codex
          </Text>
          <Text variant="small" tone="muted">
            Your reading, told as a story.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Press accessibilityRole="button" onPress={() => open('month')} style={{ flex: 1, minHeight: 44, borderRadius: radius.full, backgroundColor: GILT.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold }} color={GILT.black}>
            This month
          </Text>
        </Press>
        <Press accessibilityRole="button" onPress={() => open('year')} style={{ flex: 1, minHeight: 44, borderRadius: radius.full, borderWidth: 1, borderColor: GILT.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold }} color={GILT.champagne}>
            {year}
          </Text>
        </Press>
      </View>
    </View>
  );
}

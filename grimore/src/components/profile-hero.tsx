import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FramedAvatar, StyledName, type CornerLook } from '@/components/corner';
import { ReaderMarks } from '@/components/house-badge';
import { HousePlate } from '@/components/house-plate';
import { SCENES, type LibraryScene } from '@/components/library-room';
import { GiltDivider } from '@/components/ornament';
import { SocialLinks } from '@/components/social-links';
import { Press, Text } from '@/components/ui';
import type { Profile } from '@/services/profile';
import { readerMarks } from '@/services/houses';
import { fonts, GILT, spacing, useTheme } from '@/theme';
import { fmt } from '@/utils/dates';

const BANNER = 210;

function Count({ n, label, onPress }: { n: number; label: string; onPress?: () => void }) {
  const body = (
    <View style={{ alignItems: 'center', minWidth: 84, paddingVertical: 6, paddingHorizontal: spacing.sm }}>
      <Text style={{ fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 30, color: GILT.champagne, fontVariant: ['lining-nums'] }}>{fmt(n)}</Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 1.6, color: 'rgba(242,233,216,0.62)' }}>{label.toUpperCase()}</Text>
    </View>
  );
  return onPress ? (
    <Press accessibilityLabel={`${fmt(n)} ${label}`} onPress={onPress}>
      {body}
    </Press>
  ) : (
    <View accessibilityLabel={`${fmt(n)} ${label}`}>{body}</View>
  );
}

/**
 * The top of every profile, as the entrance to the reader's library: the
 * painted room (or the community banner they chose) behind a gilt-framed
 * portrait, the name in the display serif, and counts on gold plates.
 */
export function ProfileHero({
  profile,
  look,
  counts,
  actions,
  children,
  scene = 'classic',
}: {
  profile: Profile;
  look: CornerLook;
  counts?: { books: number; followers: number; following: number };
  actions?: ReactNode;
  children?: ReactNode;
  scene?: LibraryScene;
}) {
  const { colors } = useTheme();
  const marks = useQuery({ queryKey: ['marks', profile.id], queryFn: () => readerMarks(profile.id), staleTime: 10 * 60_000 });
  const name = profile.display_name ?? profile.username;
  return (
    <View style={{ backgroundColor: colors.bg }}>
      <View style={{ height: BANNER, overflow: 'hidden' }}>
        <Image source={look.banner_url ? { uri: look.banner_url } : SCENES[scene].image} style={{ position: 'absolute', inset: 0 }} contentFit="cover" contentPosition={look.banner_url ? 'center' : 'top'} accessibilityIgnoresInvertColors />
        <LinearGradient colors={['rgba(16,13,11,0.15)', 'rgba(16,13,11,0.35)', colors.bg]} locations={[0, 0.55, 1]} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ position: 'absolute', right: spacing.lg, bottom: 58, flexDirection: 'row', gap: spacing.sm }}>{actions}</View>
      </View>
      <View style={{ marginTop: -78, alignItems: 'center', paddingHorizontal: spacing.lg }}>
        <View style={{ padding: 4, borderRadius: 999, borderWidth: 2, borderColor: GILT.gold, backgroundColor: colors.bg }}>
          <FramedAvatar frame={look.frame} uri={profile.avatar_url} name={name} />
        </View>
        <View style={{ marginTop: spacing.md }} accessibilityRole="header">
          <StyledName name={name} style={look.name_style} size={36} serif centered />
        </View>
        <Text variant="callout" tone="muted" align="center">
          @{profile.username}
          {profile.city ? ` · ${profile.city}` : ''}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <HousePlate userId={profile.id} />
        </View>
        {marks.data?.length ? (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <ReaderMarks keys={marks.data} />
          </View>
        ) : null}
        {profile.bio ? (
          <Text style={{ marginTop: spacing.md, fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 24, textAlign: 'center' }}>{profile.bio}</Text>
        ) : null}
        <SocialLinks socials={profile.socials} />
        {counts ? (
          <>
            <GiltDivider width={260} style={{ marginTop: spacing.base }} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: 4 }}>
              <Count n={counts.books} label="books" />
              <Count n={counts.followers} label="followers" onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: profile.id, tab: 'followers' } })} />
              <Count n={counts.following} label="following" onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: profile.id, tab: 'following' } })} />
            </View>
          </>
        ) : null}
        {children}
      </View>
    </View>
  );
}

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Banner, FramedAvatar, StyledName, type CornerLook } from '@/components/corner';
import { ReaderMarks } from '@/components/house-badge';
import { HousePlate } from '@/components/house-plate';
import { SocialLinks } from '@/components/social-links';
import { Press, Text } from '@/components/ui';
import type { Profile } from '@/services/profile';
import { readerMarks } from '@/services/houses';
import { fonts, spacing } from '@/theme';
import { fmt } from '@/utils/dates';

/** Banner, framed portrait, styled name and counts: the top of every Corner. */
export function ProfileHero({ profile, look, counts, actions, children }: { profile: Profile; look: CornerLook; counts?: { books: number; followers: number; following: number }; actions?: ReactNode; children?: ReactNode }) {
  const marks = useQuery({ queryKey: ['marks', profile.id], queryFn: () => readerMarks(profile.id), staleTime: 10 * 60_000 });
  const name = profile.display_name ?? profile.username;
  return (
    <View>
      <Banner look={look} />
      <View style={{ marginTop: -52, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <FramedAvatar frame={look.frame} uri={profile.avatar_url} name={name} />
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: 4 }}>{actions}</View>
        </View>
        <View style={{ marginTop: spacing.md }} accessibilityRole="header">
          <StyledName name={name} style={look.name_style} />
        </View>
        <Text variant="callout" tone="muted">
          @{profile.username}
          {profile.city ? ` · ${profile.city}` : ''}
        </Text>
        <HousePlate userId={profile.id} />
        {marks.data?.length ? (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <ReaderMarks keys={marks.data} />
          </View>
        ) : null}
        {profile.bio ? (
          <Text variant="callout" style={{ marginTop: spacing.md }}>
            {profile.bio}
          </Text>
        ) : null}
        <SocialLinks socials={profile.socials} />
        {counts ? (
          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.base }}>
            <Text variant="callout">
              <Text variant="callout" style={{ fontFamily: fonts.bold }}>
                {fmt(counts.books)}
              </Text>{' '}
              <Text variant="callout" tone="muted">
                books
              </Text>
            </Text>
            <Press onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: profile.id, tab: 'followers' } })}>
              <Text variant="callout">
                <Text variant="callout" style={{ fontFamily: fonts.bold }}>
                  {fmt(counts.followers)}
                </Text>{' '}
                <Text variant="callout" tone="muted">
                  followers
                </Text>
              </Text>
            </Press>
            <Press onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: profile.id, tab: 'following' } })}>
              <Text variant="callout">
                <Text variant="callout" style={{ fontFamily: fonts.bold }}>
                  {fmt(counts.following)}
                </Text>{' '}
                <Text variant="callout" tone="muted">
                  following
                </Text>
              </Text>
            </Press>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

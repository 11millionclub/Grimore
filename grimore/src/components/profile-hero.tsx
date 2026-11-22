import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Banner, FramedAvatar, StyledName, type CornerLook } from '@/components/corner';
import { HousePlate } from '@/components/house-plate';
import { ARCH_ICONS } from '@/components/onboarding-flow';
import { Press, Text } from '@/components/ui';
import type { Profile } from '@/services/profile';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { ARCHETYPES, type Arch } from '@/utils/archetypes';
import { fmt } from '@/utils/dates';

/** Banner, framed portrait, styled name and counts: the top of every Corner. */
export function ProfileHero({ profile, look, counts, actions, children }: { profile: Profile; look: CornerLook; counts?: { books: number; followers: number; following: number }; actions?: ReactNode; children?: ReactNode }) {
  const { colors } = useTheme();
  const arch = profile.archetype as Arch | null;
  const Icon = arch ? ARCH_ICONS[arch] : null;
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
        {arch ? (
          <Press onPress={() => router.push({ pathname: '/dna', params: { userId: profile.id } })} style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 4 }}>
            {Icon ? <Icon size={15} weight="fill" color={colors.accent} /> : null}
            <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
              {ARCHETYPES[arch].name}
            </Text>
          </Press>
        ) : null}
        <HousePlate userId={profile.id} />
        {profile.bio ? (
          <Text variant="callout" style={{ marginTop: spacing.md }}>
            {profile.bio}
          </Text>
        ) : null}
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

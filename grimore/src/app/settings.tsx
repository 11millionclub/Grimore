import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Divider, ListRow, Screen, SectionHeader, Text } from '@/components/ui';
import { useMyProfile, usePreferences } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { signOut } from '@/services/auth';
import { updatePreferences, updateProfile } from '@/services/profile';
import { spacing, useTheme } from '@/theme';

export default function Settings() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const prefs = usePreferences();
  const id = profile.data?.id;

  const togglePrivate = async (value: boolean) => {
    if (!id) return;
    try {
      const updated = await updateProfile(id, { is_private: value });
      queryClient.setQueryData(qk.profile(id), updated);
    } catch (e) {
      Alert.alert('Could not update', toAppError(e).message);
    }
  };

  const toggleSpoilers = async (value: boolean) => {
    if (!id) return;
    try {
      await updatePreferences(id, { show_spoilers: value });
      void prefs.refetch();
    } catch (e) {
      Alert.alert('Could not update', toAppError(e).message);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          signOut().then(
            () => queryClient.clear(),
            (e) => Alert.alert('Could not sign out', toAppError(e).message),
          ),
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Settings" />
      <Screen edgeTop={false}>
        <SectionHeader eyebrow="Account" title={profile.data ? `@${profile.data.username}` : 'Account'} />
        <ListRow title="Edit profile" subtitle="Name, username, bio and photo" onPress={() => router.push('/profile/edit')} />
        <Divider />
        <ListRow title="Arrange My Corner" subtitle="Theme, layout, favourites and quotes" onPress={() => router.push('/corner/edit')} />
        <Divider />

        <View style={{ height: spacing.xxl }} />
        <SectionHeader eyebrow="Privacy" title="Who can see your reading" />
        <ListRow
          title="Private account"
          subtitle="Only followers you approve can see your library, posts and corner."
          trailing={<Switch value={!!profile.data?.is_private} onValueChange={(v) => void togglePrivate(v)} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Private account" />}
        />
        <Divider />
        <ListRow
          title="Show spoilers automatically"
          subtitle="Skip spoiler warnings in reviews and posts."
          trailing={<Switch value={!!prefs.data?.show_spoilers} onValueChange={(v) => void toggleSpoilers(v)} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Show spoilers" />}
        />
        <Divider />

        <View style={{ height: spacing.xxl }} />
        <SectionHeader eyebrow="About" title="GriMore" />
        <Text variant="callout" tone="muted">
          Your world of stories. Version {Constants.expoConfig?.version ?? '1.0.0'}.
        </Text>
        <Text variant="caption" style={{ marginTop: spacing.sm }}>
          Book data and covers from Open Library and Google Books. Daily puzzles are curated and fact-checked by hand.
        </Text>

        <View style={{ height: spacing.xxl }} />
        <ListRow title="Sign out" destructive onPress={confirmSignOut} trailing={<View />} />
      </Screen>
    </View>
  );
}

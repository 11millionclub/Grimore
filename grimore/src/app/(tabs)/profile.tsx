import { router } from 'expo-router';
import { View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { useMyProfile } from '@/hooks/queries';
import { spacing } from '@/theme';

export default function MyProfile() {
  const profile = useMyProfile();
  return (
    <Screen tabBarInset onRefresh={() => void profile.refetch()} refreshing={profile.isRefetching}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm }}>
        <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} filled />
      </View>
      {profile.data ? <ProfileView profile={profile.data} /> : profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : <Skeleton height={300} />}
    </Screen>
  );
}

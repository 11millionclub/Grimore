import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { TopBar } from '@/components/top-bar';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { getProfileByUsername } from '@/services/profile';
import { useTheme } from '@/theme';

export default function ReaderProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMyId();
  const { colors } = useTheme();
  const profile = useQuery({ queryKey: qk.profileByUsername(username), queryFn: () => getProfileByUsername(username) });

  if (profile.data?.id === me) return <Redirect href="/profile" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar />
      <Screen edgeTop={false} onRefresh={() => void profile.refetch()} refreshing={profile.isRefetching}>
        {profile.isLoading ? <Skeleton height={300} /> : null}
        {profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : null}
        {profile.isSuccess && !profile.data ? <EmptyState icon="user-x" title="Reader not found" body={`There is no reader called @${username}.`} /> : null}
        {profile.data ? <ProfileView profile={profile.data} /> : null}
      </Screen>
    </View>
  );
}

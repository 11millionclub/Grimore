import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { NookView } from '@/components/nook/nook-view';
import { TopBar } from '@/components/top-bar';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { getProfileByUsername } from '@/services/profile';
import { useTheme } from '@/theme';

/** Visiting another reader's Nook. */
export default function ReaderNook() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMyId();
  const { colors } = useTheme();
  const profile = useQuery({ queryKey: qk.profileByUsername(username), queryFn: () => getProfileByUsername(username) });

  if (profile.data?.id === me) return <Redirect href="/profile" />;
  if (profile.data) return <NookView profile={profile.data} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar />
      <Screen edgeTop={false}>
        {profile.isLoading ? <Skeleton height={300} /> : null}
        {profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : null}
        {profile.isSuccess && !profile.data ? <EmptyState icon="user-x" title="Reader not found" body={`There is no reader called @${username}.`} /> : null}
      </Screen>
    </View>
  );
}

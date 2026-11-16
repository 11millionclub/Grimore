import { NookView } from '@/components/nook/nook-view';
import { ErrorState, Screen, Skeleton } from '@/components/ui';
import { useMyProfile } from '@/hooks/queries';

/** The reader's own Nook. */
export default function MyNook() {
  const profile = useMyProfile();
  if (profile.data) return <NookView profile={profile.data} />;
  return <Screen>{profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : <Skeleton height={300} />}</Screen>;
}

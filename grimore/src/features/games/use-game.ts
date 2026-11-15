import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useMyId, useTodayChallenges } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';

import type { Challenge, GameType } from './types';

/**
 * Today's challenge for one game, plus a `play` helper that sends an action
 * to the server and writes the returned canonical state into the cache.
 */
export function useGame<T extends Challenge>(game: GameType) {
  const today = useTodayChallenges();
  const queryClient = useQueryClient();
  const userId = useMyId();
  const [error, setError] = useState<string | null>(null);
  const challenge = today.data?.find((c) => c.game === game) as T | undefined;

  const mutation = useMutation({
    mutationFn: (action: () => Promise<Challenge>) => action(),
    onMutate: () => setError(null),
    onSuccess: (next) => {
      queryClient.setQueryData<Challenge[]>(qk.today, (list) => list?.map((c) => (c.id === next.id ? next : c)));
      if (next.attempt && next.attempt.status !== 'in_progress') {
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(next.attempt.status === 'won' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
        }
        if (userId) {
          void queryClient.invalidateQueries({ queryKey: qk.progress(userId) });
          void queryClient.invalidateQueries({ queryKey: qk.stats(userId) });
          void queryClient.invalidateQueries({ queryKey: qk.achievements(userId) });
        }
      }
    },
    onError: (e) => {
      setError(toAppError(e).message);
      // The server may have moved on (e.g. finished elsewhere): resync.
      void today.refetch();
    },
  });

  const finished = !!challenge?.attempt && challenge.attempt.status !== 'in_progress';

  return {
    challenge,
    loading: today.isLoading,
    loadError: today.isError,
    refetch: today.refetch,
    finished,
    error,
    pending: mutation.isPending,
    play: (action: () => Promise<Challenge>) => mutation.mutateAsync(action).catch(() => undefined),
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Avatar, Btn, EmptyState, Press, Screen, Segmented, Text, toast } from '@/components/ui';
import { HouseBadge } from '@/components/house-badge';
import { useMyId, useProfile, useReaderHouses } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getMyFollowingIds, listFollows } from '@/services/profile';
import { follow, unfollow } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Follows() {
  const params = useLocalSearchParams<{ userId: string; tab?: 'followers' | 'following' }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const owner = useProfile(params.userId);
  const [tab, setTab] = useState<'followers' | 'following'>(params.tab ?? 'followers');
  const [q, setQ] = useState('');
  const list = useQuery({ queryKey: ['follows', params.userId, tab], queryFn: () => listFollows(params.userId, tab) });
  const mine = useQuery({ queryKey: ['myFollowing', me], queryFn: () => getMyFollowingIds(me) });
  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? follow(me, id) : unfollow(me, id)),
    // Flip the button at once instead of waiting for the refetch.
    onMutate: ({ id, on }) => qc.setQueryData<string[]>(['myFollowing', me], (old) => (on ? [...(old ?? []), id] : (old ?? []).filter((x) => x !== id))),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['myFollowing', me] });
      void qc.invalidateQueries({ queryKey: ['followStatuses', me] });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const houses = useReaderHouses((list.data ?? []).map((u) => u.id));
  const rows = (list.data ?? []).filter((u) => `${u.display_name ?? ''} ${u.username}`.toLowerCase().includes(q.toLowerCase()));
  const following = new Set(mine.data ?? []);
  return (
    <Screen title={owner.data?.display_name ?? owner.data?.username ?? ''} large={false} back refreshing={list.isRefetching} onRefresh={() => list.refetch()}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'followers', label: 'Followers' }, { value: 'following', label: 'Following' }]} />
        <View style={{ height: 40, borderRadius: radius.full, backgroundColor: colors.surface2, justifyContent: 'center', paddingHorizontal: spacing.base }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.faint} style={{ color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }} />
        </View>
      </View>
      {rows.length === 0 && !list.isLoading ? <EmptyState title={q ? 'Nobody by that name' : tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'} /> : null}
      {rows.map((u) => {
        const on = following.has(u.id);
        return (
          <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
            <Press onPress={() => router.push({ pathname: '/user/[username]', params: { username: u.username } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
              <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {u.display_name ?? u.username}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <HouseBadge house={houses.data?.[u.id]} size={16} />
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    @{u.username}
                  </Text>
                </View>
              </View>
            </Press>
            {u.id !== me ? (
              <Btn size="sm" variant={on ? 'secondary' : 'primary'} onPress={() => toggle.mutate({ id: u.id, on: !on })}>
                {on ? 'Following' : 'Follow'}
              </Btn>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

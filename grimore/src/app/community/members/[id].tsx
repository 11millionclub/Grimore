import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { ChatCircleIcon, MagnifyingGlassIcon } from '@/components/icons';
import { Avatar, EmptyState, IconBtn, Press, Screen, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getCommunity, listMembers } from '@/services/communities';
import { openConversation } from '@/services/messages';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

const TIER: Record<string, string> = { visitor: 'Visitor', member: 'Member', circle: 'Member', patron: 'Patron' };

/** Everyone in the community; the host can message each reader. */
export default function CommunityMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const c = useQuery({ queryKey: ['community', id], queryFn: () => getCommunity(id) });
  const members = useQuery({ queryKey: ['community', id, 'members'], queryFn: () => listMembers(id) });
  const [q, setQ] = useState('');
  const isHost = c.data?.host_id === me;
  const message = useMutation({
    mutationFn: (userId: string) => openConversation(userId),
    onSuccess: (conversationId) => router.push({ pathname: '/chat/[id]', params: { id: conversationId } }),
    onError: (e) => toast(toAppError(e).message),
  });
  const term = q.trim().toLowerCase();
  const list = (members.data ?? []).filter((m) => !term || m.profile?.username.toLowerCase().includes(term) || (m.profile?.display_name ?? '').toLowerCase().includes(term));

  return (
    <Screen title="Members" back>
      <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, height: 44, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base }}>
        <MagnifyingGlassIcon size={19} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Find a member" placeholderTextColor={colors.faint} accessibilityLabel="Find a member" autoCapitalize="none" style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as object} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}>
        {members.isLoading ? [0, 1, 2, 3].map((k) => <Skeleton key={k} height={60} rounded={radius.card} />) : null}
        {!members.isLoading && list.length === 0 ? <EmptyState title="No one here" body={term ? 'No member matches that name.' : 'No members yet.'} /> : null}
        {list.map((m) => (
          <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
            <Press accessibilityLabel={m.profile?.display_name ?? m.profile?.username ?? 'Reader'} onPress={() => m.profile && router.push({ pathname: '/user/[username]', params: { username: m.profile.username } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
              <Avatar uri={m.profile?.avatar_url} name={m.profile?.display_name ?? m.profile?.username} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {m.profile?.display_name ?? m.profile?.username}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  @{m.profile?.username} · {m.role === 'host' ? 'Host' : TIER[m.tier] ?? 'Member'} · joined {relativeTime(m.joined_at)}
                </Text>
              </View>
            </Press>
            {isHost && m.user_id !== me ? (
              <IconBtn label={`Message ${m.profile?.username ?? 'member'}`} size={38} filled onPress={() => message.mutate(m.user_id)}>
                <ChatCircleIcon size={18} color={colors.accent} />
              </IconBtn>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

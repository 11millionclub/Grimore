import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { MagnifyingGlassIcon } from '@/components/icons';
import { Avatar, EmptyState, Press, Screen, Skeleton, Text } from '@/components/ui';
import { useConversations } from '@/hooks/queries';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function Messages() {
  const { colors } = useTheme();
  const convs = useConversations();
  const [q, setQ] = useState('');
  const list = (convs.data ?? []).filter((c) => `${c.other_display_name ?? ''} ${c.other_username}`.toLowerCase().includes(q.toLowerCase()));
  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });
  return (
    <Screen title="Messages" back refreshing={convs.isRefetching} onRefresh={() => convs.refetch()}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.base }}>
        <View style={{ height: 40, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 14 }}>
          <MagnifyingGlassIcon size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search conversations" placeholderTextColor={colors.faint} style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }} />
        </View>
      </View>
      {(convs.data ?? []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.base }}>
          {(convs.data ?? []).slice(0, 8).map((c) => (
            <Press key={c.id} onPress={() => open(c.id)} style={{ width: 56, alignItems: 'center', gap: 6 }}>
              <Avatar uri={c.other_avatar_url} name={c.other_display_name ?? c.other_username} size={56} />
              <Text variant="micro" tone="muted" numberOfLines={1} style={{ fontFamily: fonts.regular }}>
                {(c.other_display_name ?? c.other_username).split(' ')[0]}
              </Text>
            </Press>
          ))}
        </ScrollView>
      ) : null}
      {convs.isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} height={56} rounded={radius.tile} />
          ))}
        </View>
      ) : list.length === 0 ? (
        <EmptyState title="No conversations yet" body="Open a reader’s profile and tap Message to start one." />
      ) : (
        list.map((c) => (
          <Press key={c.id} onPress={() => open(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
            <Avatar uri={c.other_avatar_url} name={c.other_display_name ?? c.other_username} size={50} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {c.other_display_name ?? c.other_username}
                </Text>
                <Text variant="caption" tone={c.unread ? 'accent' : 'faint'}>
                  {c.last_message_at ? relativeTime(c.last_message_at) : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text variant="callout" tone={c.unread ? 'ink' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
                  {c.last_message_preview}
                </Text>
                {c.unread ? (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="micro" tone="onAccent" style={{ fontFamily: fonts.bold }}>
                      {c.unread}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Press>
        ))
      )}
    </Screen>
  );
}

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Avatar, EmptyState, Icon, Screen, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { supabase } from '@/lib/supabase';
import { searchReaders } from '@/services/profile';
import { spacing, useTheme } from '@/theme';

export default function FindReaders() {
  const me = useMyId();
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 250);
  const results = useQuery({ queryKey: ['readers', term], queryFn: () => searchReaders(term), enabled: term.length >= 2 });
  // Before searching, show the most recently joined public readers.
  const recent = useQuery({
    queryKey: ['readers', 'recent'],
    queryFn: async () => (await supabase.from('profiles').select('id, username, display_name, avatar_url').not('onboarding_completed_at', 'is', null).order('created_at', { ascending: false }).limit(20)).data ?? [],
  });
  const list = (term.length >= 2 ? results.data : recent.data)?.filter((p) => p.id !== me) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Find readers" />
      <Screen keyboard edgeTop={false}>
        <TextField value={q} onChangeText={setQ} placeholder="Search by name or @username" leadingIcon="search" autoCapitalize="none" autoCorrect={false} autoFocus />
        <Text variant="eyebrow" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          {term.length >= 2 ? 'Results' : 'New on GriMore'}
        </Text>
        {term.length >= 2 && results.isSuccess && list.length === 0 ? <EmptyState compact icon="user-x" title="No readers found" body="Check the spelling, or invite a friend to join you." /> : null}
        <View style={{ gap: spacing.md }}>
          {list.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/user/[username]', params: { username: p.username } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.7 : 1 })}>
              <Avatar name={p.display_name ?? p.username} uri={p.avatar_url} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{p.display_name ?? p.username}</Text>
                <Text variant="caption">@{p.username}</Text>
              </View>
              <Icon name="chevron-right" size={18} tone="inkSubtle" />
            </Pressable>
          ))}
        </View>
      </Screen>
    </View>
  );
}

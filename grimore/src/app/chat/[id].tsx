import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Composer } from '@/components/feed';
import { Avatar, Cover, Press, Screen, Text } from '@/components/ui';
import { HouseBadge } from '@/components/house-badge';
import { useMyId, useProfile, useReaderHouses } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { getConversation, listMessages, markRead, sendMessage, subscribeToConversation, type Message } from '@/services/messages';
import { fonts, spacing, useTheme } from '@/theme';

function BookBubble({ id }: { id: string }) {
  const { colors } = useTheme();
  const b = useQuery({ queryKey: ['book-mini', id], queryFn: async () => (await supabase.from('books').select('id, title, cover_url').eq('id', id).single()).data });
  if (!b.data) return null;
  return (
    <Press onPress={() => router.push({ pathname: '/book/[id]', params: { id } })} style={{ width: 230, flexDirection: 'row', gap: spacing.md, borderRadius: 20, backgroundColor: colors.surface2, padding: spacing.md }}>
      <Cover uri={b.data.cover_url} title={b.data.title} width={48} />
      <Text variant="callout" style={{ fontFamily: fonts.semibold, flex: 1 }}>
        {b.data.title}
      </Text>
    </Press>
  );
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const conv = useQuery({ queryKey: ['conversation', id], queryFn: () => getConversation(id) });
  const otherId = conv.data ? (conv.data.user_a === me ? conv.data.user_b : conv.data.user_a) : undefined;
  const other = useProfile(otherId);
  const msgs = useQuery({ queryKey: ['messages', id], queryFn: () => listMessages(id) });

  useEffect(() => {
    void markRead(id).catch(() => undefined);
    const off = subscribeToConversation(id, (m: Message) => {
      qc.setQueryData<Message[]>(['messages', id], (old) => (old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m]));
      void markRead(id).catch(() => undefined);
    });
    return () => {
      off();
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: ['unread'] });
    };
  }, [id, qc]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage({ conversationId: id, senderId: me, body }),
    onSuccess: (m) => qc.setQueryData<Message[]>(['messages', id], (old) => (old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m])),
  });
  const houses = useReaderHouses(other.data ? [other.data.id] : []);
  const name = other.data?.display_name ?? other.data?.username ?? ' ';
  return (
    <Screen title={name} large={false} back keyboard footer={<Composer placeholder="Message" busy={send.isPending} onSend={(t) => send.mutateAsync(t)} />}>
      <Press onPress={() => other.data && router.push({ pathname: '/user/[username]', params: { username: other.data.username } })} style={{ alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm }}>
        <Avatar uri={other.data?.avatar_url} name={name} size={72} />
        <Text variant="title" style={{ marginTop: spacing.sm }}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <HouseBadge house={other.data ? houses.data?.[other.data.id] : null} size={16} named />
          <Text variant="small" tone="muted">
            @{other.data?.username}
          </Text>
        </View>
      </Press>
      <View style={{ paddingHorizontal: spacing.base, gap: 6, paddingBottom: spacing.base }}>
        {(msgs.data ?? []).map((m) => {
          const mine = m.sender_id === me;
          return (
            <View key={m.id} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {m.book_id ? (
                <BookBubble id={m.book_id} />
              ) : null}
              {m.body ? (
                <View
                  style={{
                    maxWidth: '78%',
                    borderRadius: 20,
                    borderBottomRightRadius: mine ? 6 : 20,
                    borderBottomLeftRadius: mine ? 20 : 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: mine ? colors.accent : colors.surface2,
                  }}
                >
                  <Text variant="body" tone={mine ? 'onAccent' : 'ink'}>
                    {m.body}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

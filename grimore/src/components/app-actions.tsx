import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { BellIcon, EnvelopeSimpleIcon, GearSixIcon, XIcon } from '@/components/icons';
import { Avatar, IconBtn, Press, Text } from '@/components/ui';
import { useMyId, useUnread } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { fonts, radius, spacing, useTheme } from '@/theme';

function Badge({ n }: { n?: number }) {
  const { colors } = useTheme();
  if (!n) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: 2, top: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 10, lineHeight: 12 }} color={colors.onAccent}>
        {n > 99 ? '99+' : n}
      </Text>
    </View>
  );
}

/** The fixed top-bar actions shown on every tab: messages, alerts and settings, with unread counts. */
export function AppActions() {
  const { colors } = useTheme();
  const unread = useUnread();
  const m = unread.data?.messages ?? 0;
  const n = unread.data?.notifications ?? 0;
  return (
    <>
      <IconBtn label={m ? `Messages, ${m} unread` : 'Messages'} onPress={() => router.push('/messages')}>
        <EnvelopeSimpleIcon size={22} weight={m ? 'fill' : 'regular'} color={m ? colors.accent : colors.ink} />
        <Badge n={m} />
      </IconBtn>
      <IconBtn label={n ? `Alerts, ${n} unread` : 'Alerts'} onPress={() => router.push('/notifications')}>
        <BellIcon size={22} color={colors.ink} />
        <Badge n={n} />
      </IconBtn>
      <IconBtn label="Settings" onPress={() => router.push('/settings')}>
        <GearSixIcon size={22} color={colors.ink} />
      </IconBtn>
    </>
  );
}

type Alert = { conversationId: string; name: string; avatar: string | null; preview: string; key: number };
const useAlertStore = create<{ alert: Alert | null; show: (a: Omit<Alert, 'key'>) => void; hide: () => void }>((set) => ({
  alert: null,
  show: (a) => set((s) => ({ alert: { ...a, key: (s.alert?.key ?? 0) + 1 } })),
  hide: () => set({ alert: null }),
}));

/**
 * Listens for new messages anywhere in the app (RLS only delivers the
 * reader's own conversations) and shows a banner that opens the chat.
 */
export function MessageAlerts() {
  const me = useMyId();
  const qc = useQueryClient();
  const path = usePathname();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert, show, hide } = useAlertStore();

  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`inbox:${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as { conversation_id: string; sender_id: string; body: string | null; book_id: string | null; listing_id: string | null };
        void qc.invalidateQueries({ queryKey: ['unread'] });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
        if (msg.sender_id === me) return;
        // "Messages" switched off in Settings: counts update, no banner.
        const prefs = qc.getQueryData<{ notification_settings?: Record<string, boolean> | null }>(qk.preferences);
        if (prefs?.notification_settings?.messages === false) return;
        if (useAlertStore.getState().alert?.conversationId === msg.conversation_id) hide();
        const { data } = await supabase.from('profiles').select('display_name, username, avatar_url').eq('id', msg.sender_id).maybeSingle();
        show({
          conversationId: msg.conversation_id,
          name: data?.display_name ?? data?.username ?? 'New message',
          avatar: data?.avatar_url ?? null,
          preview: msg.body?.trim() || (msg.listing_id ? 'Sent you a listing' : msg.book_id ? 'Sent you a book' : 'Sent you a message'),
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, qc, show, hide]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(hide, 6000);
    return () => clearTimeout(t);
  }, [alert, hide]);

  // Already reading that chat: no banner needed.
  if (!alert || path === `/chat/${alert.conversationId}`) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 200 }}>
      <Animated.View key={alert.key} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp} style={{ width: '100%', maxWidth: 520 }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel={`New message from ${alert.name}: ${alert.preview}. Open`}
          onPress={() => {
            hide();
            router.push({ pathname: '/chat/[id]', params: { id: alert.conversationId } });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.md,
            shadowColor: colors.shadow,
            shadowOpacity: 1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <Avatar uri={alert.avatar} name={alert.name} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
              New message · {alert.name}
            </Text>
            <Text variant="callout" numberOfLines={2}>
              {alert.preview}
            </Text>
          </View>
          <Press accessibilityLabel="Dismiss" onPress={hide} hitSlop={10} style={{ padding: 4 }}>
            <XIcon size={16} color={colors.muted} />
          </Press>
        </Press>
      </Animated.View>
    </View>
  );
}

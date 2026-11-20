import type { RealtimeChannel } from '@supabase/supabase-js';

import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type ConversationRow = {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  other_id: string;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  unread: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  book_id: string | null;
  listing_id: string | null;
  created_at: string;
};

export async function listConversations(): Promise<ConversationRow[]> {
  return (unwrap(await supabase.rpc('list_conversations')) as unknown as ConversationRow[]) ?? [];
}

export async function openConversation(otherUserId: string): Promise<string> {
  return unwrap(await supabase.rpc('open_conversation', { p_other: otherUserId }));
}

export async function getConversation(id: string) {
  return unwrap(await supabase.from('conversations').select('id, user_a, user_b').eq('id', id).single());
}

export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const rows = unwrap(
    await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, book_id, listing_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
  return rows.reverse();
}

export async function sendMessage(input: { conversationId: string; senderId: string; body?: string; bookId?: string; listingId?: string }) {
  return unwrap(
    await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        body: input.body?.trim() || null,
        book_id: input.bookId ?? null,
        listing_id: input.listingId ?? null,
      })
      .select('id, conversation_id, sender_id, body, book_id, listing_id, created_at')
      .single(),
  ) as Message;
}

export async function markRead(conversationId: string) {
  unwrap(await supabase.rpc('mark_conversation_read', { p_conversation: conversationId }));
}

/** Live new messages in one conversation (RLS limits delivery to participants). */
export function subscribeToConversation(conversationId: string, onMessage: (m: Message) => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`conversation:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) =>
      onMessage(payload.new as Message),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

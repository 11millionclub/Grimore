import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { authorLine } from './catalogue';

export type SceneId = 'great-hall' | 'candlelit-study' | 'wizard-tower' | 'dragon-archive' | 'elven-library' | 'moonlit-reading-room';
export const SCENES: SceneId[] = ['great-hall', 'candlelit-study', 'wizard-tower', 'dragon-archive', 'elven-library', 'moonlit-reading-room'];

type Row = Database['public']['Tables']['communities']['Row'];

export type Community = Row & {
  host: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  reading: { id: string; title: string; cover_url: string | null; authors: string; page_count_estimate: number | null } | null;
  match?: number;
};

const select = `*, host:profiles!communities_host_id_fkey(id, username, display_name, avatar_url),
  reading:books!communities_reading_book_id_fkey(id, title, cover_url, page_count_estimate, book_authors(position, role, authors(name)))`;

type Raw = Row & {
  host: Community['host'];
  reading: (Omit<NonNullable<Community['reading']>, 'authors'> & { book_authors: Parameters<typeof authorLine>[0] }) | null;
};

const map = (r: Raw): Community => ({
  ...r,
  reading: r.reading ? { id: r.reading.id, title: r.reading.title, cover_url: r.reading.cover_url, page_count_estimate: r.reading.page_count_estimate, authors: authorLine(r.reading.book_authors) } : null,
});

export async function listCommunities(filter: 'all' | 'free' | 'paid' = 'all'): Promise<Community[]> {
  let q = supabase.from('communities').select(select).order('member_count', { ascending: false }).limit(100);
  if (filter === 'free') q = q.is('price_cents', null);
  if (filter === 'paid') q = q.not('price_cents', 'is', null);
  return (unwrap(await q) as unknown as Raw[]).map(map);
}

/** Communities ranked by how well they match the reader's library. */
export async function suggestedCommunities(limit = 12): Promise<Community[]> {
  const scores = unwrap(await supabase.rpc('suggest_communities', { p_limit: limit }));
  if (!scores.length) return [];
  const rows = (unwrap(await supabase.from('communities').select(select).in('id', scores.map((s) => s.id))) as unknown as Raw[]).map(map);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return scores.flatMap((s) => {
    const c = byId.get(s.id);
    return c ? [{ ...c, match: s.match }] : [];
  });
}

export async function getCommunity(id: string): Promise<Community> {
  return map(unwrap(await supabase.from('communities').select(select).eq('id', id).single()) as unknown as Raw);
}

export async function myMembership(communityId: string, userId: string) {
  return unwrap(await supabase.from('community_members').select('role, tier, joined_at').eq('community_id', communityId).eq('user_id', userId).maybeSingle());
}

export async function myCommunities(userId: string): Promise<Community[]> {
  const rows = unwrap(await supabase.from('community_members').select('community_id').eq('user_id', userId).limit(100));
  if (!rows.length) return [];
  return (unwrap(await supabase.from('communities').select(select).in('id', rows.map((r) => r.community_id))) as unknown as Raw[]).map(map);
}

export async function joinCommunity(communityId: string, userId: string, paid: boolean) {
  unwrap(await supabase.from('community_members').insert({ community_id: communityId, user_id: userId, role: 'member', tier: paid ? 'visitor' : 'member' }));
}

export async function leaveCommunity(communityId: string, userId: string) {
  unwrap(await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId));
}

export function slugify(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.length >= 3 ? base : 'club'}-${suffix}`;
}

export async function createCommunity(input: {
  hostId: string;
  name: string;
  tagline?: string;
  description?: string;
  scene: SceneId;
  priceCents: number | null;
  maxMembers?: number | null;
  rules: { spoiler_tags: boolean; approve_members: boolean; live_sessions: boolean };
  readingBookId?: string | null;
}) {
  return unwrap(
    await supabase
      .from('communities')
      .insert({
        host_id: input.hostId,
        slug: slugify(input.name),
        name: input.name.trim(),
        tagline: input.tagline?.trim() || null,
        description: input.description?.trim() || null,
        cover_scene: input.scene,
        price_cents: input.priceCents,
        max_members: input.maxMembers ?? null,
        rules: input.rules,
        reading_book_id: input.readingBookId ?? null,
      })
      .select('id')
      .single(),
  );
}

export async function updateCommunity(id: string, patch: Partial<Pick<Row, 'reading_book_id' | 'reading_note' | 'tagline' | 'description'>>) {
  unwrap(await supabase.from('communities').update(patch).eq('id', id));
}

export type Thread = Database['public']['Tables']['community_threads']['Row'] & {
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function listThreads(communityId: string): Promise<Thread[]> {
  return unwrap(
    await supabase
      .from('community_threads')
      .select('*, author:profiles!community_threads_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ) as unknown as Thread[];
}

export async function getThread(id: string): Promise<Thread> {
  return unwrap(
    await supabase.from('community_threads').select('*, author:profiles!community_threads_user_id_fkey(id, username, display_name, avatar_url)').eq('id', id).single(),
  ) as unknown as Thread;
}

export async function createThread(input: { communityId: string; userId: string; title: string; body?: string; hasSpoilers?: boolean; membersOnly?: boolean }) {
  return unwrap(
    await supabase
      .from('community_threads')
      .insert({
        community_id: input.communityId,
        user_id: input.userId,
        title: input.title.trim(),
        body: input.body?.trim() || null,
        has_spoilers: !!input.hasSpoilers,
        members_only: !!input.membersOnly,
      })
      .select('id')
      .single(),
  );
}

export type Reply = { id: string; body: string; has_spoilers: boolean; created_at: string; author: Thread['author'] };

export async function listReplies(threadId: string): Promise<Reply[]> {
  return unwrap(
    await supabase
      .from('community_replies')
      .select('id, body, has_spoilers, created_at, author:profiles!community_replies_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at')
      .limit(300),
  ) as unknown as Reply[];
}

export async function addReply(threadId: string, userId: string, body: string, hasSpoilers = false) {
  unwrap(await supabase.from('community_replies').insert({ thread_id: threadId, user_id: userId, body: body.trim(), has_spoilers: hasSpoilers }));
}

export async function nextEvent(communityId: string) {
  return unwrap(
    await supabase
      .from('community_events')
      .select('id, title, details, starts_at, format, members_only')
      .eq('community_id', communityId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(1)
      .maybeSingle(),
  );
}

export async function scheduleEvent(input: { communityId: string; userId: string; title: string; startsAt: Date; format: 'audio' | 'video' | 'in_person' | 'sprint' }) {
  unwrap(
    await supabase.from('community_events').insert({
      community_id: input.communityId,
      created_by: input.userId,
      title: input.title.trim(),
      starts_at: input.startsAt.toISOString(),
      format: input.format,
    }),
  );
}

/** How far members are, on average, in the community's current book. */
export async function membersProgress(communityId: string, bookId: string): Promise<number | null> {
  const members = unwrap(await supabase.from('community_members').select('user_id').eq('community_id', communityId).limit(1000));
  if (!members.length) return null;
  const rows = unwrap(
    await supabase.from('user_books').select('progress_percent, status').eq('book_id', bookId).in('user_id', members.map((m) => m.user_id)).limit(1000),
  );
  if (!rows.length) return null;
  const vals = rows.map((r) => (r.status === 'read' ? 100 : r.progress_percent ?? 0));
  return vals.reduce((a, b) => a + b, 0) / vals.length / 100;
}

export async function communitiesForBook(bookId: string): Promise<Community[]> {
  return (unwrap(await supabase.from('communities').select(select).eq('reading_book_id', bookId).limit(6)) as unknown as Raw[]).map(map);
}

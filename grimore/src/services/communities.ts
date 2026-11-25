import { decode } from 'base64-arraybuffer';

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

export type CommunitySort = 'popular' | 'new' | 'name';
export type CommunityQuery = { filter?: 'all' | 'free' | 'paid'; search?: string; sort?: CommunitySort; reading?: boolean; open?: boolean };

export async function listCommunities(opts: CommunityQuery | 'all' | 'free' | 'paid' = 'all'): Promise<Community[]> {
  const o: CommunityQuery = typeof opts === 'string' ? { filter: opts } : opts;
  // House Common Rooms live on their own screen, not in the community directory.
  let q = supabase.from('communities').select(select).is('house_id', null);
  if (o.filter === 'free') q = q.is('price_cents', null);
  if (o.filter === 'paid') q = q.not('price_cents', 'is', null);
  if (o.reading) q = q.not('reading_book_id', 'is', null);
  const term = (o.search ?? '').trim().replace(/[%_,()]/g, '');
  if (term.length >= 2) q = q.or(`name.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`);
  q = o.sort === 'new' ? q.order('created_at', { ascending: false }) : o.sort === 'name' ? q.order('name', { ascending: true }) : q.order('member_count', { ascending: false });
  let rows = (unwrap(await q.limit(100)) as unknown as Raw[]).map(map);
  if (o.open) rows = rows.filter((c) => c.max_members == null || c.member_count < c.max_members);
  return rows;
}

export type CommunityMember = { user_id: string; role: string; tier: string; joined_at: string; profile: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null };

/** Everyone in a community, hosts first, newest members next. */
export async function listMembers(communityId: string): Promise<CommunityMember[]> {
  const rows = unwrap(
    await supabase
      .from('community_members')
      .select('user_id, role, tier, joined_at, profile:profiles!community_members_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })
      .limit(500),
  ) as unknown as CommunityMember[];
  return rows.sort((a, b) => (a.role === 'host' ? -1 : 0) - (b.role === 'host' ? -1 : 0));
}

/** Communities ranked by how well they match the reader's library. */
export async function suggestedCommunities(limit = 12): Promise<Community[]> {
  const scores = unwrap(await supabase.rpc('suggest_communities', { p_limit: limit }));
  if (!scores.length) return [];
  const rows = (unwrap(await supabase.from('communities').select(select).is('house_id', null).in('id', scores.map((s) => s.id))) as unknown as Raw[]).map(map);
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
  isPrivate?: boolean;
  isAnonymous?: boolean;
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
        is_private: !!input.isPrivate,
        is_anonymous: !!input.isAnonymous,
      })
      .select('id')
      .single(),
  );
}

export async function updateCommunity(id: string, patch: Partial<Pick<Row, 'reading_book_id' | 'reading_note' | 'tagline' | 'description' | 'name' | 'price_cents' | 'max_members' | 'cover_scene' | 'rules' | 'is_private' | 'is_anonymous'>>) {
  unwrap(await supabase.from('communities').update(patch).eq('id', id));
}

export type Thread = Database['public']['Tables']['community_threads']['Row'] & {
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  /** In anonymous communities: the writer's alias ("Reader 4F2A" or "Host"), and whether it is you. */
  alias?: string;
  mine?: boolean;
};

type AnonThread = Omit<Thread, 'author' | 'user_id'> & { alias: string; mine: boolean };
const fromAnon = (t: AnonThread): Thread => ({ ...t, user_id: '', author: null });

export async function listThreads(communityId: string, anonymous = false): Promise<Thread[]> {
  // Anonymous communities are read through the server, which never sends who wrote what.
  if (anonymous) return ((unwrap(await supabase.rpc('community_feed', { p_community: communityId })) ?? []) as unknown as AnonThread[]).map(fromAnon);
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

export type Reply = { id: string; body: string; has_spoilers: boolean; created_at: string; author: Thread['author']; alias?: string; mine?: boolean };

/** A discussion with its replies; in anonymous communities with aliases instead of names. */
export async function loadThread(id: string): Promise<{ thread: Thread; replies: Reply[]; anonymous: boolean }> {
  const anon = unwrap(await supabase.rpc('community_thread', { p_thread: id })) as unknown as { thread: AnonThread; replies: (Omit<Reply, 'author'> & { alias: string; mine: boolean })[] } | null;
  if (!anon) throw Object.assign(new Error('This discussion is gone or private.'), { code: 'not_found' });
  const c = unwrap(await supabase.from('communities').select('is_anonymous').eq('id', anon.thread.community_id).single());
  if (c.is_anonymous) return { thread: fromAnon(anon.thread), replies: anon.replies.map((r) => ({ ...r, author: null })), anonymous: true };
  const [thread, replies] = await Promise.all([getThread(id), listReplies(id)]);
  return { thread, replies, anonymous: false };
}

/** Host or moderator removes a discussion or reply (works in anonymous communities too). */
export async function removePost(kind: 'thread' | 'reply', id: string) {
  unwrap(await supabase.rpc('community_remove_post', { p_kind: kind, p_id: id }));
}

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

/** Uploads a community's logo or banner (host only) and saves its public URL. */
export async function uploadCommunityImage(communityId: string, kind: 'logo' | 'banner', base64: string, mimeType = 'image/jpeg') {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${communityId}/${kind}-${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from('community-media').upload(path, decode(base64), { contentType: mimeType, upsert: true }));
  const url = supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl;
  unwrap(await supabase.from('communities').update(kind === 'logo' ? { logo_url: url } : { banner_url: url }).eq('id', communityId));
  return url;
}

/** Paid communities whose banner this reader may wear on their Corner (active paid membership). */
export async function bannersIcanWear(userId: string) {
  const rows = unwrap(
    await supabase
      .from('community_members')
      .select('tier, community:communities!community_members_community_id_fkey(id, name, banner_url, price_cents, host_id)')
      .eq('user_id', userId),
  ) as unknown as { tier: string; community: { id: string; name: string; banner_url: string | null; price_cents: number | null; host_id: string | null } | null }[];
  return rows
    .filter((r) => r.community?.price_cents != null && r.community.banner_url && (r.tier !== 'visitor' || r.community.host_id === userId))
    .map((r) => ({ id: r.community!.id, name: r.community!.name, banner_url: r.community!.banner_url! }));
}

/* ---------- Invites (private communities) ---------- */

export type Invite = Database['public']['Tables']['community_invites']['Row'];

export async function listInvites(communityId: string): Promise<Invite[]> {
  return unwrap(await supabase.from('community_invites').select('*').eq('community_id', communityId).is('revoked_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(50));
}

export async function createInvite(communityId: string, maxUses: number | null = null, days = 30) {
  return unwrap(await supabase.rpc('create_community_invite', { p_community: communityId, p_max_uses: maxUses, p_days: days }));
}

export async function revokeInvite(code: string) {
  unwrap(await supabase.rpc('revoke_community_invite', { p_code: code }));
}

export type InvitePreview = {
  community_id: string;
  name: string;
  tagline: string | null;
  cover_scene: string;
  logo_url: string | null;
  banner_url: string | null;
  price_cents: number | null;
  member_count: number;
  is_private: boolean;
  is_anonymous: boolean;
  host: { username: string; display_name: string | null; avatar_url: string | null } | null;
  already_member: boolean;
};

export async function previewInvite(code: string): Promise<InvitePreview | null> {
  return unwrap(await supabase.rpc('community_invite_preview', { p_code: code })) as unknown as InvitePreview | null;
}

export async function joinByInvite(code: string): Promise<string> {
  return unwrap(await supabase.rpc('join_community_by_invite', { p_code: code }));
}

/** The link to share for an invite. */
export const inviteLink = (code: string) => `https://grimore.expo.app/community/invite/${code}`;

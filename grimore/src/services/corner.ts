import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export async function getQuotes(userId: string) {
  return unwrap(
    await supabase.from('user_quotes').select('id, body, attribution, book_id, position').eq('user_id', userId).order('position').order('created_at').limit(20),
  );
}

export async function addQuote(userId: string, body: string, attribution?: string) {
  unwrap(await supabase.from('user_quotes').insert({ user_id: userId, body: body.trim(), attribution: attribution?.trim() || null }));
}

export async function deleteQuote(id: string) {
  unwrap(await supabase.from('user_quotes').delete().eq('id', id));
}

export async function getFavoriteAuthors(userId: string) {
  const rows = unwrap(await supabase.from('user_favorite_authors').select('position, author:authors(id, name, nationality_code)').eq('user_id', userId).order('position'));
  return rows.map((r) => r.author).filter((a): a is NonNullable<typeof a> => !!a);
}

export async function addFavoriteAuthor(userId: string, authorId: string, position: number) {
  unwrap(await supabase.from('user_favorite_authors').upsert({ user_id: userId, author_id: authorId, position }));
}

export async function removeFavoriteAuthor(userId: string, authorId: string) {
  unwrap(await supabase.from('user_favorite_authors').delete().eq('user_id', userId).eq('author_id', authorId));
}

export async function searchAuthors(query: string) {
  const term = query.trim().replace(/[%_]/g, '');
  if (term.length < 2) return [];
  return unwrap(await supabase.from('authors').select('id, name, nationality_code').ilike('name', `%${term}%`).limit(15));
}

export async function getLists(userId: string) {
  return unwrap(
    await supabase
      .from('reading_lists')
      .select('id, title, description, is_public, reading_list_books(book:books(id, title, cover_url))')
      .eq('user_id', userId)
      .order('position')
      .limit(20),
  );
}

export async function createList(userId: string, title: string, description?: string) {
  return unwrap(await supabase.from('reading_lists').insert({ user_id: userId, title: title.trim(), description: description?.trim() || null }).select('id').single());
}

export async function addToList(listId: string, bookId: string) {
  unwrap(await supabase.from('reading_list_books').upsert({ list_id: listId, book_id: bookId }, { ignoreDuplicates: true }));
}

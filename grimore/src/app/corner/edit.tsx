import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BookSearch } from '@/components/book-search';
import { MyCorner } from '@/components/corner/my-corner';
import { TopBar } from '@/components/top-bar';
import { BookCover, Button, Icon, InlineAlert, Screen, SectionHeader, Segmented, Text, TextField } from '@/components/ui';
import { useCorner } from '@/features/corner/use-corner';
import { useFavoriteBooks, useMyId, useMyProfile, usePreferences } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { addFavoriteAuthor, addQuote, deleteQuote, getFavoriteAuthors, getQuotes, removeFavoriteAuthor, searchAuthors } from '@/services/corner';
import { addFavoriteBook, removeFavoriteBook, updatePreferences, type Preferences } from '@/services/profile';
import { cornerThemes, radius, spacing, useTheme, type CornerThemeId } from '@/theme';

export default function EditCorner() {
  const userId = useMyId()!;
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const prefs = usePreferences();
  const favourites = useFavoriteBooks(userId);
  const corner = useCorner(userId, (profile.data?.display_name ?? profile.data?.username ?? '').split(' ')[0]);
  const quotes = useQuery({ queryKey: ['quotes', userId], queryFn: () => getQuotes(userId) });
  const authors = useQuery({ queryKey: ['favAuthors', userId], queryFn: () => getFavoriteAuthors(userId) });

  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [addingBook, setAddingBook] = useState(false);
  const aq = useDebounced(authorQuery, 250);
  const authorResults = useQuery({ queryKey: ['authorSearch', aq], queryFn: () => searchAuthors(aq), enabled: aq.length >= 2 });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.corner(userId) });
    void queryClient.invalidateQueries({ queryKey: qk.preferences });
    void queryClient.invalidateQueries({ queryKey: qk.favorites(userId) });
    void quotes.refetch();
    void authors.refetch();
  };
  const run = useMutation({ mutationFn: (fn: () => Promise<void>) => fn(), onSuccess: refresh, onError: (e) => setError(toAppError(e).message), onMutate: () => setError(null) });
  const setPref = (patch: Partial<Preferences>) => run.mutate(() => updatePreferences(userId, patch));

  const p = prefs.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="Arrange My Corner" />
      <Screen keyboard edgeTop={false}>
        {corner.data ? <MyCorner data={corner.data} /> : null}
        {error ? (
          <View style={{ marginTop: spacing.base }}>
            <InlineAlert>{error}</InlineAlert>
          </View>
        ) : null}

        <View style={{ gap: spacing.xxl, marginTop: spacing.xxl }}>
          <View style={{ gap: spacing.md }}>
            <SectionHeader eyebrow="Backdrop" title="Theme" />
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              {(Object.keys(cornerThemes) as CornerThemeId[]).map((id) => {
                const t = cornerThemes[id];
                const on = p?.corner_theme === id;
                return (
                  <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label} theme`} onPress={() => setPref({ corner_theme: id })} style={{ alignItems: 'center', gap: spacing.xs }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.background, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: t.accent }} />
                    </View>
                    <Text variant="caption" tone={on ? 'ink' : 'muted'}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionHeader eyebrow="Composition" title="Layout" />
            <Segmented
              options={[
                { value: 'editorial', label: 'Editorial' },
                { value: 'shelf', label: 'Shelf' },
                { value: 'gallery', label: 'Gallery' },
              ]}
              value={(p?.corner_layout as 'editorial' | 'shelf' | 'gallery') ?? 'editorial'}
              onChange={(v) => setPref({ corner_layout: v })}
            />
            <Text variant="eyebrow" style={{ marginTop: spacing.sm }}>
              Books on the shelf
            </Text>
            <Segmented
              options={[
                { value: 'spine', label: 'Spines' },
                { value: 'cover', label: 'Covers' },
                { value: 'stack', label: 'Stacked' },
              ]}
              value={(p?.corner_book_arrangement as 'spine' | 'cover' | 'stack') ?? 'spine'}
              onChange={(v) => setPref({ corner_book_arrangement: v })}
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionHeader eyebrow="Up to twelve" title="Favourite books" actionLabel={addingBook ? 'Done' : 'Add'} onAction={() => setAddingBook((x) => !x)} />
            <Text variant="caption">Tap a book to feature it. Long-press to remove.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {(favourites.data ?? []).map((b) => {
                const featured = p?.corner_featured_book_id === b.id;
                return (
                  <Pressable
                    key={b.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}${featured ? ', featured' : ''}`}
                    accessibilityHint="Tap to feature, long press to remove"
                    onPress={() => setPref({ corner_featured_book_id: featured ? null : b.id })}
                    onLongPress={() => run.mutate(() => removeFavoriteBook(userId, b.id))}
                  >
                    <BookCover title={b.title} uri={b.cover_url} width={64} accessible={false} />
                    {featured ? (
                      <View style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="star" size={12} color={colors.onAccent} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {addingBook && (favourites.data?.length ?? 0) < 12 ? (
              <BookSearch excludeIds={(favourites.data ?? []).map((b) => b.id)} onSelect={(b) => run.mutate(() => addFavoriteBook(userId, b.id, favourites.data?.length ?? 0))} />
            ) : null}
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionHeader eyebrow="Words to keep" title="Quotes" />
            {(quotes.data ?? []).map((q) => (
              <View key={q.id} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="quote" style={{ fontSize: 16, lineHeight: 23 }}>
                    “{q.body}”
                  </Text>
                  {q.attribution ? <Text variant="caption">{q.attribution}</Text> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete quote" onPress={() => run.mutate(() => deleteQuote(q.id))} hitSlop={10}>
                  <Icon name="trash-2" size={16} tone="inkMuted" />
                </Pressable>
              </View>
            ))}
            <TextField value={quote} onChangeText={setQuote} placeholder="A line you carry with you" multiline maxLength={600} />
            <TextField value={attribution} onChangeText={setAttribution} placeholder="Who wrote it? (optional)" maxLength={160} />
            <Button
              title="Add quote"
              variant="secondary"
              size="sm"
              disabled={!quote.trim()}
              onPress={() =>
                run.mutate(async () => {
                  await addQuote(userId, quote, attribution);
                  setQuote('');
                  setAttribution('');
                })
              }
              style={{ alignSelf: 'flex-start' }}
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionHeader eyebrow="Kindred spirits" title="Favourite authors" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(authors.data ?? []).map((a) => (
                <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`} onPress={() => run.mutate(() => removeFavoriteAuthor(userId, a.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, height: 34, borderRadius: radius.full, backgroundColor: colors.ink }}>
                  <Text variant="callout" style={{ color: colors.canvas, fontSize: 13.5 }}>
                    {a.name}
                  </Text>
                  <Icon name="x" size={13} color={colors.canvas} />
                </Pressable>
              ))}
            </View>
            <TextField value={authorQuery} onChangeText={setAuthorQuery} placeholder="Search authors in GriMore" leadingIcon="search" />
            {(authorResults.data ?? [])
              .filter((a) => !(authors.data ?? []).some((x) => x.id === a.id))
              .slice(0, 6)
              .map((a) => (
                <Pressable key={a.id} accessibilityRole="button" onPress={() => run.mutate(() => addFavoriteAuthor(userId, a.id, authors.data?.length ?? 0))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
                  <Text variant="body">{a.name}</Text>
                  <Icon name="plus" size={18} tone="accent" />
                </Pressable>
              ))}
          </View>
        </View>
      </Screen>
    </View>
  );
}

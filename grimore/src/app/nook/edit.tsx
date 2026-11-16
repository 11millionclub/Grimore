import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BookSearch } from '@/components/book-search';
import { LibraryScene, SCENE_IDS, SCENES } from '@/components/nook/library-scene';
import { NookBackdrop } from '@/components/nook/nook-backdrop';
import { Portrait } from '@/components/nook/portrait';
import { Flourish } from '@/components/ornaments';
import { TopBar } from '@/components/top-bar';
import { BookCover, Button, Icon, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { useNook, type NookFrame } from '@/features/nook/use-nook';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { addFavoriteAuthor, addQuote, deleteQuote, getFavoriteAuthors, getQuotes, removeFavoriteAuthor, searchAuthors } from '@/services/corner';
import { addFavoriteBook, removeFavoriteBook, updatePreferences, uploadNookBackground, type Preferences } from '@/services/profile';
import { fonts, layout, radius, sealColors, shelfWoods, spacing, useTheme, type SealColorId, type ShelfWoodId } from '@/theme';

export default function ArrangeNook() {
  const userId = useMyId()!;
  const { colors, scheme } = useTheme();
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const nook = useNook(userId);
  const quotes = useQuery({ queryKey: ['quotes', userId], queryFn: () => getQuotes(userId) });
  const authors = useQuery({ queryKey: ['favAuthors', userId], queryFn: () => getFavoriteAuthors(userId) });

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [addingBook, setAddingBook] = useState(false);
  const aq = useDebounced(authorQuery, 250);
  const authorResults = useQuery({ queryKey: ['authorSearch', aq], queryFn: () => searchAuthors(aq), enabled: aq.length >= 2 });

  const s = nook.data?.settings;
  const name = profile.data?.display_name ?? profile.data?.username ?? '';
  const sealColor = (id: SealColorId) => (scheme === 'dark' ? sealColors[id].light : sealColors[id].color);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.corner(userId) });
    void queryClient.invalidateQueries({ queryKey: qk.preferences });
    void queryClient.invalidateQueries({ queryKey: qk.favorites(userId) });
    void quotes.refetch();
    void authors.refetch();
  };
  const run = useMutation({ mutationFn: (fn: () => Promise<void>) => fn(), onMutate: () => setError(null), onSuccess: refresh, onError: (e) => setError(toAppError(e).message) });
  const setPref = (patch: Partial<Preferences>) => run.mutate(() => updatePreferences(userId, patch));

  const pickBackground = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.75, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const url = await uploadNookBackground(userId, asset.base64!, asset.mimeType ?? 'image/jpeg');
      await updatePreferences(userId, { nook_background_url: url, nook_scene: 'custom' });
      refresh();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="Arrange your Nook" />
      <Screen keyboard edgeTop={false} padded={false}>
        {/* Live preview */}
        <NookBackdrop scene={s?.scene ?? 'great-hall'} backgroundUrl={s?.background_url} style={{ height: 260, marginHorizontal: layout.screenPadding, borderRadius: radius.lg }}>
          <View style={{ position: 'absolute', bottom: spacing.base, left: 0, right: 0, alignItems: 'center', gap: spacing.xs }}>
            <Portrait name={name} uri={profile.data?.avatar_url} frame={s?.frame ?? 'arch'} size={64} />
            <Text style={{ fontFamily: fonts.serifItalic, fontSize: 16, color: sealColor(s?.seal ?? 'wine') }}>{s?.title || 'Your epithet'}</Text>
          </View>
        </NookBackdrop>

        <View style={{ paddingHorizontal: layout.screenPadding, gap: spacing.xxl, marginTop: spacing.xl }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}

          {/* Background */}
          <Section title="The room" hint="Pick an illustrated library, or hang a photo of your own.">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -layout.screenPadding }} contentContainerStyle={{ paddingHorizontal: layout.screenPadding, gap: spacing.md }}>
              {SCENE_IDS.map((id) => {
                const on = s?.scene === id;
                return (
                  <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${SCENES[id].label}. ${SCENES[id].description}`} onPress={() => setPref({ nook_scene: id })} style={{ width: 104, gap: spacing.xs }}>
                    <View style={{ borderRadius: radius.md, borderWidth: on ? 2 : 1, borderColor: on ? colors.gold : colors.border, padding: 2 }}>
                      <LibraryScene id={id} style={{ width: 96, height: 136, borderRadius: radius.sm }} />
                    </View>
                    <Text variant="caption" tone={on ? 'ink' : 'muted'} numberOfLines={1}>
                      {SCENES[id].label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="Use your own photo as background" onPress={() => void pickBackground()} style={{ width: 104, gap: spacing.xs }}>
                <View style={{ borderRadius: radius.md, borderWidth: s?.scene === 'custom' ? 2 : 1, borderColor: s?.scene === 'custom' ? colors.gold : colors.borderStrong, borderStyle: s?.background_url ? 'solid' : 'dashed', padding: 2 }}>
                  {s?.background_url ? (
                    <Image source={{ uri: s.background_url }} style={{ width: 96, height: 136, borderRadius: radius.sm }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 96, height: 136, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                      <Icon name="image" size={22} tone="inkMuted" />
                      <Text variant="caption" align="center">
                        {uploading ? 'Uploading…' : 'Your photo'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" tone={s?.scene === 'custom' ? 'ink' : 'muted'}>
                  {s?.background_url ? 'Change photo' : 'Own photo'}
                </Text>
              </Pressable>
            </ScrollView>
            <Text variant="caption" tone="subtle">
              Use photos you took or have the right to use. Your background is visible to anyone who can see your Nook.
            </Text>
          </Section>

          {/* Seal colour */}
          <Section title="Wax seal" hint="Your colour, used across your Nook.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base }}>
              {(Object.keys(sealColors) as SealColorId[]).map((id) => {
                const on = s?.seal === id;
                return (
                  <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${sealColors[id].label} seal`} onPress={() => setPref({ nook_seal: id })} style={{ alignItems: 'center', gap: spacing.xs }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: sealColor(id), borderWidth: on ? 3 : 0, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                      {on ? <Icon name="check" size={16} color="#F6EEDD" /> : null}
                    </View>
                    <Text variant="caption" tone={on ? 'ink' : 'muted'}>
                      {sealColors[id].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Frame */}
          <Section title="Portrait frame">
            <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-end' }}>
              {(['arch', 'circle', 'shield'] as NookFrame[]).map((f) => (
                <Pressable key={f} accessibilityRole="radio" accessibilityState={{ selected: s?.frame === f }} accessibilityLabel={`${f} frame`} onPress={() => setPref({ nook_frame: f })} style={{ alignItems: 'center', gap: spacing.sm, opacity: s?.frame === f ? 1 : 0.55 }}>
                  <Portrait name={name} uri={profile.data?.avatar_url} frame={f} size={52} color={s?.frame === f ? colors.gold : colors.borderStrong} />
                  <Text variant="caption" tone={s?.frame === f ? 'ink' : 'muted'}>
                    {f === 'arch' ? 'Gothic arch' : f === 'circle' ? 'Roundel' : 'Shield'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* Epithet */}
          <Section title="Epithet" hint="A line under your name. Leave empty for “Keeper of N tomes”.">
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <TextField value={title ?? s?.title ?? ''} onChangeText={setTitle} placeholder="Collector of rainy-day mysteries" maxLength={48} />
              </View>
              {title !== null && title !== (s?.title ?? '') ? (
                <Button
                  title="Save"
                  onPress={() => {
                    setPref({ nook_title: title.trim() || null });
                    setTitle(null);
                  }}
                />
              ) : null}
            </View>
          </Section>

          {/* Shelf */}
          <Section title="Treasured shelf" hint="Up to twelve books. Tap one to make it your current obsession; long-press to remove." actionLabel={addingBook ? 'Done' : 'Add books'} onAction={() => setAddingBook((x) => !x)}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
              {(Object.keys(shelfWoods) as ShelfWoodId[]).map((w) => (
                <Pressable key={w} accessibilityRole="radio" accessibilityState={{ selected: s?.shelf === w }} onPress={() => setPref({ nook_shelf: w })} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
                  <View style={{ alignSelf: 'stretch', height: 14, borderRadius: 2, backgroundColor: shelfWoods[w].top, borderBottomWidth: 5, borderBottomColor: shelfWoods[w].edge, opacity: s?.shelf === w ? 1 : 0.6 }} />
                  <Text variant="caption" tone={s?.shelf === w ? 'ink' : 'muted'}>
                    {shelfWoods[w].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {(nook.data?.favourites ?? []).map((b) => {
                const featured = nook.data?.featured?.id === b.id && !!s?.featured_book_id;
                return (
                  <Pressable
                    key={b.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}${featured ? ', current obsession' : ''}`}
                    accessibilityHint="Tap to feature, long press to remove"
                    onPress={() => setPref({ corner_featured_book_id: featured ? null : b.id })}
                    onLongPress={() => run.mutate(() => removeFavoriteBook(userId, b.id))}
                  >
                    <BookCover title={b.title} uri={b.cover_url} width={60} accessible={false} />
                    {featured ? (
                      <View style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="star" size={12} color="#FFF8E8" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {addingBook && (nook.data?.favourites.length ?? 0) < 12 ? (
              <BookSearch excludeIds={(nook.data?.favourites ?? []).map((b) => b.id)} onSelect={(b) => run.mutate(() => addFavoriteBook(userId, b.id, nook.data?.favourites.length ?? 0))} />
            ) : null}
          </Section>

          {/* Quotes */}
          <Section title="Words to keep" hint="Your first quote is displayed beside your current obsession.">
            {(quotes.data ?? []).map((q) => (
              <View key={q.id} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="quote" style={{ fontSize: 17, lineHeight: 23 }}>
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
          </Section>

          {/* Authors */}
          <Section title="Kindred spirits" hint="The authors who shaped you.">
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
          </Section>

          <Flourish glyph="dragon" style={{ marginBottom: spacing.xl }} />
        </View>
      </Screen>
    </View>
  );
}

function Section({ title, hint, children, actionLabel, onAction }: { title: string; hint?: string; children: React.ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title3">{title}</Text>
          {hint ? <Text variant="caption">{hint}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
            <Text variant="callout" tone="accent">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
